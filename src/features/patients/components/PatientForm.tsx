import React, { useState, useEffect, useCallback } from 'react'; // Added React import and useCallback
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Patient, BloodGroup, Gender, MaritalStatus, Json } from '@/types';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"; // Added for simplified form
import { Input } from "@/components/ui/input"; // Added for simplified form
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for simplified form
import { PatientPersonalInfoForm, personalInfoSchema } from './PatientPersonalInfoForm';
import { PatientContactInfoForm, contactInfoSchema } from './PatientContactInfoForm'; // Re-enabled import
import {
  PatientMedicalInfoForm,
  medicalInfoSchema
} from './PatientMedicalInfoForm';
import {
  PatientDentalHistoryForm,
  dentalHistorySchema
} from './PatientDentalHistoryForm'; // Added Import
import {
  PatientFamilyHistoryForm,
  familyHistorySchema
} from './PatientFamilyHistoryForm'; // Added Import
import {
  PatientLifestyleForm,
  lifestyleSchema
} from './PatientLifestyleForm'; // Added Import
import {
  PatientConsentForm,
  consentSchema
} from './PatientConsentForm'; // Added Import
import {
  PatientDocumentsForm,
  documentsSchema // Keep documents form import
} from './PatientDocumentsForm';
import { z } from 'zod';

// Combine schemas: Personal, Contact, Medical (which includes others), Documents
// Combine ALL schemas
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape,
  ...dentalHistorySchema.shape,   // Added Dental History
  ...familyHistorySchema.shape,  // Added Family History
  ...lifestyleSchema.shape,    // Added Lifestyle
  ...consentSchema.shape,      // Added Consent
  ...documentsSchema.shape,
});

// Define the simplified schema
const simplifiedPatientSchema = z.object({
  first_name: personalInfoSchema.shape.first_name,
  last_name: personalInfoSchema.shape.last_name,
  middle_name: personalInfoSchema.shape.middle_name.optional(), // Ensure optional if not always needed
  gender: personalInfoSchema.shape.gender,
  age: personalInfoSchema.shape.age,
  occupation: personalInfoSchema.shape.occupation.optional(), // Ensure optional if not always needed
  phone: contactInfoSchema.shape.phone, // Add phone from contact schema
});

// Define the form values type based on the combined schema (for full form)
type FullPatientFormValues = z.infer<typeof patientSchema>;
// Define the form values type based on the simplified schema
type SimplifiedPatientFormValues = z.infer<typeof simplifiedPatientSchema>;
// Union type for form values
type PatientFormValues = FullPatientFormValues | SimplifiedPatientFormValues;

// Define the structure of a document object stored in the JSONB array
// Ensure this matches the structure used in uploadFile and onSubmit
interface PatientDocument {
  path: string;
  url: string;
  name: string;
  type: string;
  size?: number;
  uploaded_at: string;
}

interface PatientFormProps {
  patient?: Patient | null;
  onSuccess: (patientId?: string) => void;
  onCancel: () => void;
  mode?: 'simplified' | 'full'; // Add mode prop
}

export function PatientForm({ patient, onSuccess, onCancel, mode = 'full' }: PatientFormProps) { // Default mode to 'full'
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isSimplifiedMode = mode === 'simplified';

  const formatArrayToString = useCallback((value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value ?? '');
  }, []);

  // Define initial default values for the simplified form
  const simplifiedDefaultValues: SimplifiedPatientFormValues = {
    first_name: '', last_name: '', middle_name: '', gender: 'male', age: null,
    occupation: '', phone: '',
  };

  // Define initial default values for the full form
  const fullDefaultValues: FullPatientFormValues = {
    ...simplifiedDefaultValues, // Start with simplified defaults
    // Add defaults for fields NOT in simplified view
    marital_status: 'single',
    email: '', address: '', city: '', state: '', postal_code: '', country: 'USA',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    // Medical Info (Core) - From PatientMedicalInfoForm
    blood_group: 'unknown', height: null, weight: null, has_allergies: 'no', // Removed allergies_details
    // Allergy arrays and details (initialize as empty/null)
    medication_allergies: [], other_medication_allergy_details: '',
    food_allergies: [], other_food_allergy_details: '',
    environmental_allergies: [], other_environmental_allergy_details: '',
    other_allergies: [], other_allergy_details: '', other_allergies_manual_input: '',
    // Rest of medical info
    diagnosed_conditions: [], other_diagnosed_condition: '', has_implants: 'no', implants_details: '',
    taking_medications: 'no', current_medications: [], // Changed to array
    recent_health_changes: 'no', health_changes_details: '',
    previous_surgeries: [], // Changed to array
    immunizations_up_to_date: 'not_sure', recent_immunizations: '',
    recent_medical_screenings: 'no', screenings_details: '', dental_material_allergies: 'no',
    dental_material_allergies_details: '', notes: '', // Ensure notes is initialized here too
    // Dental History - From PatientDentalHistoryForm (Updated)
    dh_reason_for_visit: undefined, dh_reason_for_visit_other: "", dh_chief_complaint: "",
    dh_has_pain: "no", dh_pain_description: "", dh_pain_scale: undefined, dh_pain_duration_onset: "",
    dh_past_treatments: [], dh_past_treatments_other: "", // Use new fields
    dh_brushing_frequency: undefined, dh_flossing_habits: undefined, dh_additional_hygiene_products: "",
    dh_technique_tools: "", dh_orthodontic_history: "no", dh_orthodontic_details: "", dh_has_records: "no",
    dh_xray_frequency: "", dh_bite_issues: "no", dh_bite_symptoms: "", dh_cosmetic_concerns: "no",
    dh_cosmetic_issues_details: "", dh_functional_concerns: "", dh_emergency_history: "no",
    dh_emergency_details: "", dh_additional_summary: "", dh_future_goals: "",
    // Family History - From PatientFamilyHistoryForm
    family_medical_conditions: [], family_medical_conditions_other: "", family_dental_issues: [], family_dental_issues_other: "", // Corrected key from fh_ to family_
    // Lifestyle - From PatientLifestyleForm (Corrected keys)
    diet_description: "", exercise_frequency: undefined, stress_level: undefined,
    has_sleep_issues: "no", sleep_issues_details: "", pregnancy_status: "not_applicable",
    pregnancy_comments: "", has_mental_health_conditions: "no", mental_health_details: "",
    additional_concerns: "", additional_comments: "",
    acknowledgment: false, patient_signature_consent: "", consent_date: new Date(), // Consent defaults
    consent_given: false, consent_notes: "", profile_photo: undefined, signature: undefined, id_document: undefined, // Document defaults
  };


  // Calculate default values based on mode and patient prop
  const calculateDefaultValues = useCallback((currentPatient: Patient | null | undefined): Partial<PatientFormValues> => {
    const baseDefaults = isSimplifiedMode ? simplifiedDefaultValues : fullDefaultValues;
    const patientOverrides: Partial<PatientFormValues> = currentPatient ? {
        // Always map these core fields
        first_name: currentPatient.first_name || '',
        last_name: currentPatient.last_name || '',
        middle_name: currentPatient.middle_name || '',
        gender: currentPatient.gender || 'male',
        age: currentPatient.age ?? null,
        occupation: currentPatient.occupation || '',
        phone: currentPatient.phone || '', // Always include phone

        // Map additional fields only in full mode
        ...(!isSimplifiedMode && {
          marital_status: currentPatient.marital_status || 'single',
          email: currentPatient.email || '',
          address: currentPatient.address || '',
          city: currentPatient.city || '',
          state: currentPatient.state || '',
          postal_code: currentPatient.postal_code || '',
          country: currentPatient.country || 'USA',
          emergency_contact_name: currentPatient.emergency_contact_name || '',
          emergency_contact_phone: currentPatient.emergency_contact_phone || '',
          emergency_contact_relationship: currentPatient.emergency_contact_relationship || '',
          blood_group: currentPatient.blood_group || 'unknown',
          height: currentPatient.height ?? null,
          weight: currentPatient.weight ?? null,
          // Map detailed medical info if available (assuming it's stored in detailed_medical_info JSON)
          has_allergies: (currentPatient.detailed_medical_info as any)?.has_allergies || 'no', // Get from JSON if exists
          // Map allergy arrays/details from JSON if they exist
          medication_allergies: (currentPatient.detailed_medical_info as any)?.medication_allergies || [],
          other_medication_allergy_details: (currentPatient.detailed_medical_info as any)?.other_medication_allergy_details || '',
          food_allergies: (currentPatient.detailed_medical_info as any)?.food_allergies || [],
          other_food_allergy_details: (currentPatient.detailed_medical_info as any)?.other_food_allergy_details || '',
          environmental_allergies: (currentPatient.detailed_medical_info as any)?.environmental_allergies || [],
          other_environmental_allergy_details: (currentPatient.detailed_medical_info as any)?.other_environmental_allergy_details || '',
          other_allergies: (currentPatient.detailed_medical_info as any)?.other_allergies || [],
          other_allergy_details: (currentPatient.detailed_medical_info as any)?.other_allergy_details || '',
          other_allergies_manual_input: (currentPatient.detailed_medical_info as any)?.other_allergies_manual_input || '',
          // Map other fields
          diagnosed_conditions: Array.isArray(currentPatient.medical_conditions) ? currentPatient.medical_conditions : [],
          taking_medications: currentPatient.current_medications && Array.isArray(currentPatient.current_medications) && currentPatient.current_medications.length > 0 ? "yes" : "no",
          current_medications: Array.isArray(currentPatient.current_medications) ? (currentPatient.current_medications as { name: string; dosage?: string; frequency?: string }[]) : [],
          previous_surgeries: Array.isArray(currentPatient.previous_surgeries) ? (currentPatient.previous_surgeries as { type: string; date?: string; notes?: string }[]) : [],
          notes: currentPatient.notes || '',
          consent_given: currentPatient.consent_given || false,
          consent_notes: currentPatient.consent_notes || "",
          // TODO: Map detailed history/lifestyle/etc. if needed for full mode editing
        })
    } : {};

    return {
      ...baseDefaults,
      ...patientOverrides,
    };
  }, [patient, formatArrayToString, isSimplifiedMode]); // Add isSimplifiedMode dependency

  // --- Initialize React Hook Form ---
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(isSimplifiedMode ? simplifiedPatientSchema : patientSchema), // Use correct schema based on mode
    defaultValues: calculateDefaultValues(patient), // Calculate initial defaults
  });
  // --- End Initialize React Hook Form ---

  // Reset form if patient data or mode changes
  useEffect(() => {
    form.reset(calculateDefaultValues(patient));
  }, [patient, mode, form.reset, calculateDefaultValues]); // Add mode dependency


  // Helper function to upload file and get details
  const uploadFile = async (file: File, patientId: string, fieldName: string): Promise<PatientDocument | null> => {
    if (!(file instanceof File)) { return null; }
    console.log(`Uploading ${fieldName} for ${patientId}`);
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError || !session) { throw new Error("Auth failed."); }
    const fileExt = file.name.split('.').pop();
    const filePath = `public/${patientId}/${fieldName}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('medical-records').upload(filePath, file);
    if (uploadError) { throw new Error(`Upload failed: ${uploadError.message}`); }
    const { data: urlData } = supabase.storage.from('medical-records').getPublicUrl(filePath);
    if (!urlData?.publicUrl) { throw new Error(`Failed to get URL.`); }
    return { path: filePath, url: urlData.publicUrl, name: file.name, type: fieldName, size: file.size, uploaded_at: new Date().toISOString() };
  };


  const onSubmit = async (data: PatientFormValues) => {
    setLoading(true);
    try {
      const currentPatientId = patient?.id;
      // Cast data to FullPatientFormValues to access document fields safely within the full mode check
      const fullDataForUploadCheck = data as FullPatientFormValues;
      if (!currentPatientId && (fullDataForUploadCheck.profile_photo instanceof File || fullDataForUploadCheck.signature instanceof File || fullDataForUploadCheck.id_document instanceof File)) {
         throw new Error("Cannot upload files for a new patient. Save first.");
      }

      // Initialize documents array, carefully handling potential Json from patient prop
      let documents: PatientDocument[] = [];
      let profilePhotoUrl = patient?.profile_photo_url || null;
      let signatureUrl = patient?.signature_url || null;

      // File uploads only possible in full mode and when editing
      if (!isSimplifiedMode && currentPatientId) {
        if (Array.isArray(patient?.documents)) {
          documents = patient.documents as unknown as PatientDocument[];
        }
        // Cast data again here for type safety when accessing document fields
        const fullDataForUpload = data as FullPatientFormValues;

        if (fullDataForUpload.profile_photo instanceof File) {
            const uploadedDoc = await uploadFile(fullDataForUpload.profile_photo, currentPatientId, 'profile_photo');
            if (uploadedDoc) { profilePhotoUrl = uploadedDoc.url; documents = documents.filter(doc => doc.type !== 'profile_photo'); documents.push(uploadedDoc); }
        }
        if (fullDataForUpload.signature instanceof File) {
            const uploadedDoc = await uploadFile(fullDataForUpload.signature, currentPatientId, 'signature');
            if (uploadedDoc) { signatureUrl = uploadedDoc.url; documents = documents.filter(doc => doc.type !== 'signature'); documents.push(uploadedDoc); }
        }
        if (fullDataForUpload.id_document instanceof File) {
            const uploadedDoc = await uploadFile(fullDataForUpload.id_document, currentPatientId, 'id_document');
            if (uploadedDoc) { documents = documents.filter(doc => doc.type !== 'id_document'); documents.push(uploadedDoc); }
        }
      } else if (!currentPatientId && (fullDataForUploadCheck.profile_photo instanceof File || fullDataForUploadCheck.signature instanceof File || fullDataForUploadCheck.id_document instanceof File)) {
        // Prevent file upload on initial create even in full mode (current logic) - use the already cast variable
        throw new Error("Cannot upload files for a new patient. Save first.");
      }


      // --- Prepare Patient Data Payload ---
      const stringToArray = (value: string | undefined | null): string[] | null => {
        if (!value || typeof value !== 'string') return null;
        const arr = value.split(',').map(item => item.trim()).filter(Boolean);
        return arr.length > 0 ? arr : null;
      };

      // Map common fields first
      const commonPatientData: Partial<Patient> = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        middle_name: data.middle_name || null,
        gender: data.gender as Gender || null,
        age: data.age ?? null,
        occupation: data.occupation || null,
        phone: data.phone || '',
      };

      let patientData: Partial<Patient>;

      if (isSimplifiedMode) {
        patientData = commonPatientData; // Only common fields for simplified mode
      } else {
        // Include all fields for full mode
        const fullData = data as FullPatientFormValues; // Cast to access all fields
        patientData = {
          ...commonPatientData,
          marital_status: fullData.marital_status as MaritalStatus || null,
          email: fullData.email || null,
          address: fullData.address || null,
          city: fullData.city || null,
          state: fullData.state || null,
          postal_code: fullData.postal_code || null,
          country: fullData.country || null,
          emergency_contact_name: fullData.emergency_contact_name || null,
          emergency_contact_phone: fullData.emergency_contact_phone || null,
          emergency_contact_relationship: fullData.emergency_contact_relationship || null,
          blood_group: fullData.blood_group as BloodGroup || null,
          height: fullData.height ?? null,
          weight: fullData.weight ?? null,
          // allergies: fullData.has_allergies === 'yes' ? stringToArray(fullData.allergies_details) : null, // Removed old allergy mapping
          medical_conditions: [
            ...(fullData.diagnosed_conditions || []),
            ...(fullData.other_diagnosed_condition ? [fullData.other_diagnosed_condition] : [])
          ].length > 0 ? [
            ...(fullData.diagnosed_conditions || []),
            ...(fullData.other_diagnosed_condition ? [fullData.other_diagnosed_condition] : [])
          ] : null,
          current_medications: fullData.taking_medications === 'yes' ? (fullData.current_medications || []) : null,
          previous_surgeries: fullData.previous_surgeries && fullData.previous_surgeries.length > 0 ? fullData.previous_surgeries : null,
          detailed_medical_info: {
              has_implants: fullData.has_implants,
              implants_details: fullData.implants_details || null,
              recent_health_changes: fullData.recent_health_changes,
              health_changes_details: fullData.health_changes_details || null,
              immunizations_up_to_date: fullData.immunizations_up_to_date,
              recent_immunizations: fullData.recent_immunizations || null,
              recent_medical_screenings: fullData.recent_medical_screenings,
              screenings_details: fullData.screenings_details || null,
              dental_material_allergies: fullData.dental_material_allergies,
              dental_material_allergies_details: fullData.dental_material_allergies_details || null,
              // Add detailed allergy fields here
              has_allergies: fullData.has_allergies, // Store the yes/no flag
              medication_allergies: fullData.medication_allergies || [],
              other_medication_allergy_details: fullData.other_medication_allergy_details || null,
              food_allergies: fullData.food_allergies || [],
              other_food_allergy_details: fullData.other_food_allergy_details || null,
              environmental_allergies: fullData.environmental_allergies || [],
              other_environmental_allergy_details: fullData.other_environmental_allergy_details || null,
              other_allergies: fullData.other_allergies || [],
              other_allergy_details: fullData.other_allergy_details || null,
              other_allergies_manual_input: fullData.other_allergies_manual_input || null,
          } as unknown as Json,
          dental_history: {
              reason_for_visit: fullData.dh_reason_for_visit,
              reason_for_visit_other: fullData.dh_reason_for_visit_other || null,
              chief_complaint: fullData.dh_chief_complaint || null,
              has_pain: fullData.dh_has_pain,
              pain_description: fullData.dh_pain_description || null,
              pain_scale: fullData.dh_pain_scale,
              pain_duration_onset: fullData.dh_pain_duration_onset || null,
              // Use new past treatment fields
              past_treatments: fullData.dh_past_treatments || [],
              past_treatments_other: fullData.dh_past_treatments_other || null,
              // Remove old fields: dh_past_treatments_details, dh_treatment_dates, dh_treatment_outcomes, dh_follow_up_treatments
              brushing_frequency: fullData.dh_brushing_frequency,
              flossing_habits: fullData.dh_flossing_habits,
              additional_hygiene_products: fullData.dh_additional_hygiene_products || null,
              technique_tools: fullData.dh_technique_tools || null,
              orthodontic_history: fullData.dh_orthodontic_history,
              orthodontic_details: fullData.dh_orthodontic_details || null,
              has_records: fullData.dh_has_records,
              xray_frequency: fullData.dh_xray_frequency || null,
              bite_issues: fullData.dh_bite_issues,
              bite_symptoms: fullData.dh_bite_symptoms || null,
              cosmetic_concerns: fullData.dh_cosmetic_concerns,
              cosmetic_issues_details: fullData.dh_cosmetic_issues_details || null,
              functional_concerns: fullData.dh_functional_concerns || null,
              emergency_history: fullData.dh_emergency_history,
              emergency_details: fullData.dh_emergency_details || null,
              additional_summary: fullData.dh_additional_summary || null,
              future_goals: fullData.dh_future_goals || null,
          } as unknown as Json,
          family_medical_history: {
              conditions: fullData.family_medical_conditions || [],
              other: fullData.family_medical_conditions_other || null,
              dental_issues: fullData.family_dental_issues || [],
              dental_other: fullData.family_dental_issues_other || null,
          },
          lifestyle_habits: {
              diet: fullData.diet_description || null,
              exercise: fullData.exercise_frequency || null,
              stress: fullData.stress_level || null,
              sleep_issues: fullData.has_sleep_issues === 'yes' ? fullData.sleep_issues_details || 'Yes, details missing' : 'No',
              pregnancy_status: fullData.pregnancy_status || null,
              pregnancy_comments: fullData.pregnancy_comments || null,
              mental_health: fullData.has_mental_health_conditions === 'yes' ? fullData.mental_health_details || 'Yes, details missing' : 'No',
              additional_concerns: fullData.additional_concerns || null,
              additional_comments: fullData.additional_comments || null,
          } as unknown as Json, // Cast lifestyle_habits to Json
          notes: fullData.notes || null,
          consent_given: fullData.consent_given || null,
          profile_photo_url: profilePhotoUrl,
          signature_url: signatureUrl,
          documents: documents as unknown as Json,
        };
      }
      // --- End Prepare Patient Data Payload ---

      // --- Database Operation ---
      if (currentPatientId) {
        console.log(`Updating existing patient (${mode} mode):`, currentPatientId);
        await api.patients.update(currentPatientId, patientData);
        toast({ title: "Success", description: "Patient information updated successfully" });
        onSuccess();
      } else {
        console.log(`Creating new patient (${mode} mode)...`);
        // Ensure file URLs and documents are not sent on create
        const createPayload = { ...patientData };
        delete createPayload.profile_photo_url;
        delete createPayload.signature_url;
        delete createPayload.documents;
        // Ensure detailed fields are null/empty if creating in simplified mode
        if (isSimplifiedMode) {
            createPayload.marital_status = null;
            createPayload.email = null;
            createPayload.address = null;
            createPayload.city = null;
            createPayload.state = null;
            createPayload.postal_code = null;
            createPayload.country = null;
            createPayload.emergency_contact_name = null;
            createPayload.emergency_contact_phone = null;
            createPayload.emergency_contact_relationship = null;
            createPayload.blood_group = null;
            createPayload.height = null;
            createPayload.weight = null;
            createPayload.allergies = null;
            createPayload.medical_conditions = null;
            createPayload.current_medications = null;
            createPayload.previous_surgeries = null;
            createPayload.detailed_medical_info = null;
            createPayload.dental_history = null;
            createPayload.family_medical_history = null;
            createPayload.lifestyle_habits = null;
            createPayload.notes = null;
            createPayload.consent_given = null;
        }

        const newPatient = await api.patients.create(createPayload as any); // Use 'as any' or define specific create type
        console.log("New patient created:", newPatient.id);
        const successMessage = isSimplifiedMode
          ? "Basic patient info saved. Complete profile later."
          : "Patient created successfully. Edit to add documents.";
        toast({ title: "Success", description: successMessage });
        onSuccess(newPatient.id);
      }
    } catch (error: any) {
      console.error('Error saving patient:', error);
      let description = "Failed to save patient information.";
      if (error.message.startsWith("Auth")) { description = error.message; }
      else if (error.message.startsWith("Failed to upload")) { description = error.message; }
      else if (error.message.startsWith("Cannot upload")) { description = error.message; }
      else if (error.message.startsWith("Upload succeeded")) { description = error.message; }
      toast({ title: "Error", description: description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Return JSX ---
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isSimplifiedMode ? (
          // --- Simplified Mode UI ---
          <div className="space-y-6 pt-6 max-h-[calc(90vh-200px)] overflow-y-auto p-1">
             <div className="space-y-2">
                <h3 className="text-lg font-medium">Basic Patient Information</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the essential details for the new patient.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Replicate fields from PatientPersonalInfoForm, excluding marital_status */}
                 <FormField control={form.control} name="first_name" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="middle_name" render={({ field }) => ( <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input placeholder="Michael" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="last_name" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="age" render={({ field }) => ( <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="25" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="occupation" render={({ field }) => ( <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 {/* Add Phone field from PatientContactInfoForm */}
                 <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
          </div>
        ) : (
          // --- Full Mode UI (Existing Tabs) ---
          <div className="pt-6">
            <Tabs defaultValue="personal" className="space-y-4">
              <TabsList>
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="contact">Contact Info</TabsTrigger>
                <TabsTrigger value="medical">Medical & History</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                <PatientPersonalInfoForm />
              </TabsContent>
              <TabsContent value="contact" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                 {/* Render the full contact form component directly */}
                 <PatientContactInfoForm />
              </TabsContent>
              <TabsContent value="medical" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1 space-y-8">
                <PatientMedicalInfoForm />
                <PatientDentalHistoryForm />
                <PatientFamilyHistoryForm />
                <PatientLifestyleForm />
                <PatientConsentForm />
              </TabsContent>
              <TabsContent value="documents" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                <PatientDocumentsForm />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Common Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? (<><span className="mr-2">Saving...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Save Changes')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
