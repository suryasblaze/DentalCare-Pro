import { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form'; // Ensure useForm is imported
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
// import { useAuth } from '@/context/AuthContext'; // Removed unused import
import { api } from '@/lib/api';
// Only import the shared instance now
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js'; // Import Session type
import {
  PatientPersonalInfoForm,
  personalInfoSchema
} from './PatientPersonalInfoForm';
import {
  PatientContactInfoForm,
  contactInfoSchema
} from './PatientContactInfoForm';
import {
  PatientMedicalInfoForm,
  medicalInfoSchema // Schema now expects string for medications
} from './PatientMedicalInfoForm';
import {
  PatientDocumentsForm,
  documentsSchema
} from './PatientDocumentsForm';
import { z } from 'zod';

// Combine all schemas (reverting to simple spread)
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape, // Schema now expects string for medications
  ...documentsSchema.shape
});

interface PatientFormProps {
  patient?: any;
  onSuccess: (patientId?: string) => void;
  onCancel: () => void;
}

export function PatientForm({ patient, onSuccess, onCancel }: PatientFormProps) {
  const { toast } = useToast();
  // const { user, loading: authLoading, /* other context values if needed */ } = useAuth(); // Removed unused context hook call
  // const navigate = useNavigate(); // Removed unused variable
  const [loading, setLoading] = useState(false);

  // --- Robust Default Values ---
  const formatArrayToString = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? ''); // Handle null/undefined and ensure string
  };

  const defaultValues = {
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    middle_name: patient?.middle_name || '',
    gender: patient?.gender || 'male',
    age: patient?.age || '', // Use empty string instead of null
    marital_status: patient?.marital_status || 'single',
    occupation: patient?.occupation || '',
    phone: patient?.phone || '',
    email: patient?.email || '',
    address: patient?.address || '',
    city: patient?.city || '',
    state: patient?.state || '',
    postal_code: patient?.postal_code || '',
    country: patient?.country || 'USA',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_phone: patient?.emergency_contact_phone || '',
    emergency_contact_relationship: patient?.emergency_contact_relationship || '',
    blood_group: patient?.blood_group || 'unknown',
    height: patient?.height ? String(patient.height) : '', // Use empty string instead of null
    weight: patient?.weight ? String(patient.weight) : '', // Use empty string instead of null
    allergies: formatArrayToString(patient?.allergies),
    medical_conditions: formatArrayToString(patient?.medical_conditions),
    current_medications: formatArrayToString(patient?.current_medications), // Use helper
    notes: patient?.notes || '',
    consent_given: patient?.consent_given || false,
    profile_photo_url: patient?.profile_photo_url || null,
    signature_url: patient?.signature_url || null,
    id_document_url: patient?.id_document_url || null, // Keep for potential display, but not saved
  };
  // --- End Robust Default Values ---

  // --- Initialize React Hook Form ---
  const form = useForm<any>({
    resolver: zodResolver(patientSchema),
    defaultValues
  });
  // --- End Initialize React Hook Form ---

  // Define a type for the document object stored in the JSONB array
  interface PatientDocument {
    path: string;
    url: string;
    name: string;
    type: string; // e.g., 'profile_photo', 'signature', 'id_document', 'medical_record'
    size?: number;
    uploaded_at: string;
  }

  // Helper function to upload file and get details
  const uploadFile = async (file: File, patientId: string, fieldName: string): Promise<PatientDocument | null> => {
    if (!(file instanceof File)) {
      console.log(`uploadFile skipped for ${fieldName}: not a File object.`);
      return null;
    }

    console.log(`Attempting to upload ${fieldName} for patientId: ${patientId}`);

    // --- Authentication Check ---
    // Get session JUST BEFORE upload attempt using the shared client
    console.log("Checking session using shared supabase client...");
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError || !session || !session.access_token) {
      console.error("Auth Error in uploadFile (using shared client):", getSessionError, session);
      throw new Error("Authentication failed: Cannot get user session for upload.");
    }
    console.log(`Auth check passed in uploadFile for ${fieldName} using shared client.`);
    // --- End Authentication Check ---

    const fileExt = file.name.split('.').pop();
    const filePath = `public/${patientId}/${fieldName}-${Date.now()}.${fileExt}`;
    console.log(`Constructed filePath: ${filePath}`);

    // Use the shared client for the upload
    const { error: uploadError } = await supabase.storage
      .from('medical-records')
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Supabase upload error object for ${fieldName} (using shared client):`, JSON.stringify(uploadError, null, 2));
      console.error(`Error uploading ${fieldName} (using shared client):`, uploadError);
      throw new Error(`Failed to upload ${fieldName}: ${uploadError.message}`);
    }

    // Use the shared client to get the public URL
    const { data: urlData } = supabase.storage
      .from('medical-records')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error(`Could not get public URL for ${filePath} (using shared client)`);
      throw new Error(`Upload succeeded but failed to get public URL for ${filePath}`);
    }

    // Return the full document object
    return {
      path: filePath,
      url: urlData.publicUrl,
      name: file.name,
      type: fieldName,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    };
  };


  const onSubmit = async (data: any) => {
    setLoading(true);

    // Removed initial session check here - uploadFile will handle authentication.

    try {
      const currentPatientId = patient?.id;

      // Prevent file uploads for NEW patients (no ID yet)
      if (!currentPatientId && (data.profile_photo instanceof File || data.signature instanceof File || data.id_document instanceof File)) {
         console.warn("File uploads are skipped for new patients until after creation.");
         throw new Error("Cannot upload files for a new patient record. Please save the patient first, then edit to add files.");
      }

      // Initialize documents array
      let documents: PatientDocument[] = patient?.documents || [];

      // --- File Upload Logic ---
      // Only attempt uploads if currentPatientId exists
      let profilePhotoUrl = patient?.profile_photo_url || null;
      if (data.profile_photo instanceof File && currentPatientId) {
          console.log("Processing profile_photo upload...");
          const uploadedDoc = await uploadFile(data.profile_photo, currentPatientId, 'profile_photo');
          if (uploadedDoc) {
              profilePhotoUrl = uploadedDoc.url;
              documents = documents.filter(doc => doc.type !== 'profile_photo');
              documents.push(uploadedDoc);
          }
      }

      let signatureUrl = patient?.signature_url || null;
      if (data.signature instanceof File && currentPatientId) {
          console.log("Processing signature upload...");
          const uploadedDoc = await uploadFile(data.signature, currentPatientId, 'signature');
          if (uploadedDoc) {
              signatureUrl = uploadedDoc.url;
              documents = documents.filter(doc => doc.type !== 'signature');
              documents.push(uploadedDoc);
          }
      }

      // Handle ID document upload (only adds to documents array)
      if (data.id_document instanceof File && currentPatientId) {
          console.log("Processing id_document upload...");
          const uploadedDoc = await uploadFile(data.id_document, currentPatientId, 'id_document');
          if (uploadedDoc) {
              documents = documents.filter(doc => doc.type !== 'id_document');
              documents.push(uploadedDoc);
          }
      }
      // --- End File Upload Logic ---


      // --- Prepare Patient Data Payload ---
      const stringToArray = (value: string | undefined | null): string[] => {
          if (!value || typeof value !== 'string') return [];
          return value.split(',').map(item => item.trim()).filter(Boolean);
      };

      const patientData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        gender: data.gender,
        age: data.age ? parseInt(String(data.age), 10) : null,
        marital_status: data.marital_status,
        occupation: data.occupation,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relationship: data.emergency_contact_relationship,
        blood_group: data.blood_group,
        height: data.height === '' || data.height === null || isNaN(parseFloat(data.height)) ? null : parseFloat(data.height),
        weight: data.weight === '' || data.weight === null || isNaN(parseFloat(data.weight)) ? null : parseFloat(data.weight),
        allergies: stringToArray(data.allergies),
        medical_conditions: stringToArray(data.medical_conditions),
        current_medications: stringToArray(data.current_medications), // Use helper
        notes: data.notes,
        consent_given: data.consent_given,
        profile_photo_url: profilePhotoUrl,
        signature_url: signatureUrl,
        documents: documents,
      };
      // --- End Prepare Patient Data Payload ---


      // Remove file input fields from payload before sending to API
      delete patientData.profile_photo;
      delete patientData.signature;
      delete patientData.id_document;

      // --- Database Operation ---
      // Use the main shared supabase client (api.ts uses this) for DB operations
      if (currentPatientId) {
        console.log("Updating existing patient:", currentPatientId);
        await api.patients.update(currentPatientId, patientData);
        toast({
          title: "Success",
          description: "Patient information updated successfully",
        });
        onSuccess();
      } else {
        console.log("Creating new patient...");
        delete patientData.profile_photo_url;
        delete patientData.signature_url;
        delete patientData.documents;
        const newPatient = await api.patients.create(patientData);
        console.log("New patient created:", newPatient.id);
        toast({
          title: "Success",
          description: "Patient created successfully. You can now edit the record to add documents.",
        });
        onSuccess(newPatient.id);
      }
    } catch (error: any) {
      console.error('Error saving patient:', error);
      let description = "Failed to save patient information.";
      if (error.message.startsWith("Authentication failed")) {
          description = "Authentication failed. Please log out and log back in.";
      } else if (error.message.startsWith("Failed to upload")) {
          description = `File upload failed: ${error.message}`;
      } else if (error.message.startsWith("Cannot upload files")) {
          description = error.message;
      } else if (error.message.startsWith("Upload succeeded but failed")) {
           description = "File upload succeeded but failed to get public URL.";
      }
      toast({
        title: "Error",
        description: description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Return JSX ---
  // Removed outer div and CardHeader
  return (
      <FormProvider {...form}>
        {/* Removed outer Card */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Removed CardContent wrapper, added padding directly if needed */}
            <div className="pt-6"> 
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact Info</TabsTrigger>
                  <TabsTrigger value="medical">Medical Info</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                {/* Add max-height and overflow to each TabsContent */}
                <TabsContent value="personal" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1"> {/* Adjust 250px based on actual header/footer/tabs height */}
                  <PatientPersonalInfoForm />
                </TabsContent>
                <TabsContent value="contact" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                  <PatientContactInfoForm />
                </TabsContent>
                <TabsContent value="medical" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                  <PatientMedicalInfoForm />
                </TabsContent>
                <TabsContent value="documents" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                  <PatientDocumentsForm />
                </TabsContent>
              </Tabs>
            </div> {/* End padding div */}

          <div className="flex justify-end gap-2 pt-4"> {/* Added padding top */}
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  Saving...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
  );
  // --- End Return JSX ---
}
