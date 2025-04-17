import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'; // Added Icons & CheckCircle
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Use standard Dialog
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Label } from "@/components/ui/label"; // Import Label
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Patient, BloodGroup, Gender, MaritalStatus, Json } from '@/types';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientPersonalInfoForm, personalInfoSchema } from './PatientPersonalInfoForm';
import { PatientContactInfoForm, contactInfoSchema } from './PatientContactInfoForm';
import {
  PatientMedicalInfoForm,
  medicalInfoSchema
} from './PatientMedicalInfoForm';
import {
  PatientDentalHistoryForm,
  dentalHistorySchema
} from './PatientDentalHistoryForm';
import {
  PatientFamilyHistoryForm,
  familyHistorySchema
} from './PatientFamilyHistoryForm';
import {
  PatientLifestyleForm,
  lifestyleSchema
} from './PatientLifestyleForm';
// Consent form component is no longer needed here
// import {
//   PatientConsentForm,
//   consentSchema
// } from './PatientConsentForm';
import {
  PatientDocumentsForm,
  documentsSchema
} from './PatientDocumentsForm';
import { z, ZodSchema } from 'zod';

// Keep individual schemas accessible
const consentFieldsSchema = z.object({
  acknowledgment: z.boolean().refine(val => val === true, {
    message: "You must acknowledge that the information provided is accurate.",
  }),
  patient_signature_consent: z.string().optional(),
  consent_date: z.date().optional().default(new Date()),
});

// Combine ALL schemas for the full form type definition, including consent
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape,
  ...dentalHistorySchema.shape,
  ...familyHistorySchema.shape,
  ...lifestyleSchema.shape,
  ...consentFieldsSchema.shape, // Add consent fields here
  ...documentsSchema.shape,
});

// Define the simplified schema
const simplifiedPatientSchema = z.object({
  first_name: personalInfoSchema.shape.first_name,
  last_name: personalInfoSchema.shape.last_name,
  middle_name: personalInfoSchema.shape.middle_name.optional(),
  gender: personalInfoSchema.shape.gender,
  age: personalInfoSchema.shape.age,
  occupation: personalInfoSchema.shape.occupation.optional(),
  phone: contactInfoSchema.shape.phone,
});

// Define the form values type based on the combined schema (for full form)
type FullPatientFormValues = z.infer<typeof patientSchema>;
// Define the form values type based on the simplified schema
type SimplifiedPatientFormValues = z.infer<typeof simplifiedPatientSchema>;
// Union type for form values
type PatientFormValues = FullPatientFormValues | SimplifiedPatientFormValues;

// Define the structure of a document object stored in the JSONB array
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
  mode?: 'simplified' | 'full';
}

// Define tab order for navigation
const tabOrder: string[] = [
  'personal',
  'contact',
  'medical',
  'dental',
  'family_lifestyle',
  // 'consent', // Removed consent tab
  'documents',
];

// Map tab names to their field names
// Note: This assumes the schemas accurately reflect the fields in each component
const getFieldsForSchema = (schema: ZodSchema<any>): string[] => {
    // Use instanceof for proper type checking
    if (schema instanceof z.ZodObject) {
        return Object.keys(schema.shape);
    }
    return [];
};

const tabToFields: Record<string, string[]> = {
  personal: getFieldsForSchema(personalInfoSchema),
  contact: getFieldsForSchema(contactInfoSchema),
  medical: getFieldsForSchema(medicalInfoSchema),
  dental: getFieldsForSchema(dentalHistorySchema),
  family_lifestyle: [
      ...getFieldsForSchema(familyHistorySchema),
      ...getFieldsForSchema(lifestyleSchema)
  ],
  // Consent fields are handled in the dialog, not a tab
  documents: getFieldsForSchema(documentsSchema),
};


export function PatientForm({ patient, onSuccess, onCancel, mode = 'full' }: PatientFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  // State for fields inside the dialog
  const [dialogAcknowledgment, setDialogAcknowledgment] = useState(false);
  const [dialogSignature, setDialogSignature] = useState('');
  const [dialogConsentDate, setDialogConsentDate] = useState<Date | null>(new Date());
  // ---
  const [pendingSubmitData, setPendingSubmitData] = useState<FullPatientFormValues | null>(null); // Use Full type here
  const [activeTab, setActiveTab] = useState(tabOrder[0]); // Start at the first tab
  // isConsentSubmission state is no longer needed as dialog always shows consent
  const isSimplifiedMode = mode === 'simplified';

  // Define initial default values for the simplified form
  const simplifiedDefaultValues: SimplifiedPatientFormValues = {
    first_name: '', last_name: '', middle_name: '', gender: 'male', age: null,
    occupation: '', phone: '',
  };

  // Define initial default values for the full form (without confirmation fields)
  const fullDefaultValues: FullPatientFormValues = {
    ...simplifiedDefaultValues,
    marital_status: 'single',
    email: '', address: '', city: '', state: '', postal_code: '', country: 'USA',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    blood_group: 'unknown', height: null, weight: null, has_allergies: 'no',
    medication_allergies: [], other_medication_allergy_details: '',
    food_allergies: [], other_food_allergy_details: '',
    environmental_allergies: [], other_environmental_allergy_details: '',
    other_allergies: [], other_allergy_details: '', other_allergies_manual_input: '',
    diagnosed_conditions: [], other_diagnosed_condition: '', has_implants: 'no', implants_details: '',
    taking_medications: 'no', current_medications: [],
    recent_health_changes: 'no', health_changes_details: '',
    previous_surgeries: [],
    immunizations_up_to_date: 'not_sure', recent_immunizations: '',
    recent_medical_screenings: 'no', screenings_details: '', dental_material_allergies: 'no',
    dental_material_allergies_details: '', notes: '',
    dh_reason_for_visit: undefined, dh_reason_for_visit_other: "", dh_chief_complaint: "",
    dh_has_pain: "no", dh_pain_description: "", dh_pain_scale: undefined, dh_pain_duration_onset: "",
    dh_past_treatments: [], dh_past_treatments_other: "",
    dh_brushing_frequency: undefined, dh_flossing_habits: undefined, dh_additional_hygiene_products: "",
    dh_technique_tools: "", dh_orthodontic_history: "no", dh_orthodontic_details: "", dh_has_records: "no",
    dh_xray_frequency: "", dh_bite_issues: "no", dh_bite_symptoms: "", dh_cosmetic_concerns: "no",
    dh_cosmetic_issues_details: "", dh_functional_concerns: "", dh_emergency_history: "no",
    dh_emergency_details: "", dh_additional_summary: "", dh_future_goals: "",
    family_medical_conditions: [], family_medical_conditions_other: "", family_dental_issues: [], family_dental_issues_other: "",
    diet_description: "", exercise_frequency: undefined, stress_level: undefined,
    has_sleep_issues: "no", sleep_issues_details: "", pregnancy_status: "not_applicable",
    pregnancy_comments: "", has_mental_health_conditions: "no", mental_health_details: "",
    additional_concerns: "", additional_comments: "",
    // Default values for consent fields (though they will be set in dialog)
    acknowledgment: false, patient_signature_consent: "", consent_date: new Date(),
    consent_given: false, consent_notes: "", profile_photo: undefined, signature: undefined, id_document: undefined,
  };

  // Calculate default values based on mode and patient prop
  const calculateDefaultValues = useCallback((currentPatient: Patient | null | undefined): Partial<PatientFormValues> => {
    const baseDefaults = isSimplifiedMode ? simplifiedDefaultValues : fullDefaultValues;
    const patientOverrides: Partial<PatientFormValues> = currentPatient ? {
        first_name: currentPatient.first_name || '',
        last_name: currentPatient.last_name || '',
        middle_name: currentPatient.middle_name || '',
        gender: currentPatient.gender || 'male',
        age: currentPatient.age ?? null,
        occupation: currentPatient.occupation || '',
        phone: currentPatient.phone || '',
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
          has_allergies: (currentPatient.detailed_medical_info as any)?.has_allergies || 'no',
          medication_allergies: (currentPatient.detailed_medical_info as any)?.medication_allergies || [],
          other_medication_allergy_details: (currentPatient.detailed_medical_info as any)?.other_medication_allergy_details || '',
          food_allergies: (currentPatient.detailed_medical_info as any)?.food_allergies || [],
          other_food_allergy_details: (currentPatient.detailed_medical_info as any)?.other_food_allergy_details || '',
          environmental_allergies: (currentPatient.detailed_medical_info as any)?.environmental_allergies || [],
          other_environmental_allergy_details: (currentPatient.detailed_medical_info as any)?.other_environmental_allergy_details || '',
          other_allergies: (currentPatient.detailed_medical_info as any)?.other_allergies || [],
          other_allergy_details: (currentPatient.detailed_medical_info as any)?.other_allergy_details || '',
          other_allergies_manual_input: (currentPatient.detailed_medical_info as any)?.other_allergies_manual_input || '',
          diagnosed_conditions: Array.isArray(currentPatient.medical_conditions) ? currentPatient.medical_conditions : [],
          taking_medications: currentPatient.current_medications && Array.isArray(currentPatient.current_medications) && currentPatient.current_medications.length > 0 ? "yes" : "no",
          current_medications: Array.isArray(currentPatient.current_medications) ? (currentPatient.current_medications as { name: string; dosage?: string; frequency?: string }[]) : [],
          previous_surgeries: Array.isArray(currentPatient.previous_surgeries) ? (currentPatient.previous_surgeries as { type: string; date?: string; notes?: string }[]) : [],
          notes: currentPatient.notes || '',
          consent_given: currentPatient.consent_given || false,
          consent_notes: currentPatient.consent_notes || "",
          // Map detailed history/lifestyle/etc. from JSONB fields if they exist
          ...(currentPatient.dental_history && typeof currentPatient.dental_history === 'object' ? { ...(currentPatient.dental_history as object) } : {}),
          ...(currentPatient.family_medical_history && typeof currentPatient.family_medical_history === 'object' ? { ...(currentPatient.family_medical_history as object) } : {}),
          ...(currentPatient.lifestyle_habits && typeof currentPatient.lifestyle_habits === 'object' ? { ...(currentPatient.lifestyle_habits as object) } : {}),
        })
    } : {};

    return {
      ...baseDefaults,
      ...patientOverrides,
    };
  }, [patient, isSimplifiedMode]);

  // Use the full schema for the resolver, but validation logic will be manual for full mode save
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(isSimplifiedMode ? simplifiedPatientSchema : patientSchema),
    defaultValues: calculateDefaultValues(patient),
    mode: 'onChange', // Optional: Show errors as user types
  });

  useEffect(() => {
    form.reset(calculateDefaultValues(patient));
  }, [patient, mode, form.reset, calculateDefaultValues]);

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

  const performSave = async (saveData: PatientFormValues) => {
    setLoading(true);
    try {
      const currentPatientId = patient?.id;
      const fullDataForUploadCheck = saveData as FullPatientFormValues;

      if (!currentPatientId && (fullDataForUploadCheck.profile_photo instanceof File || fullDataForUploadCheck.signature instanceof File || fullDataForUploadCheck.id_document instanceof File)) {
         throw new Error("Cannot upload files for a new patient. Save first.");
      }

      let documents: PatientDocument[] = [];
      let profilePhotoUrl = patient?.profile_photo_url || null;
      let signatureUrl = patient?.signature_url || null;

      if (!isSimplifiedMode && currentPatientId) {
        if (Array.isArray(patient?.documents)) {
          documents = patient.documents as unknown as PatientDocument[];
        }
        const fullDataForUpload = fullDataForUploadCheck;
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
        throw new Error("Cannot upload files for a new patient. Save first.");
      }

      const commonPatientData: Partial<Patient> = {
        first_name: saveData.first_name || '',
        last_name: saveData.last_name || '',
        middle_name: saveData.middle_name || null,
        gender: saveData.gender as Gender || null,
        age: saveData.age ?? null,
        occupation: saveData.occupation || null,
        phone: saveData.phone || '',
      };

      let patientData: Partial<Patient>;

      if (isSimplifiedMode) {
        patientData = commonPatientData;
      } else {
        const fullData = saveData as FullPatientFormValues;
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
              has_allergies: fullData.has_allergies,
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
              past_treatments: fullData.dh_past_treatments || [],
              past_treatments_other: fullData.dh_past_treatments_other || null,
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
          } as unknown as Json,
          notes: fullData.notes || null,
          consent_given: fullData.consent_given || null,
          profile_photo_url: profilePhotoUrl,
          signature_url: signatureUrl,
          documents: documents as unknown as Json,
        };
      }

      if (currentPatientId) {
        console.log(`Updating existing patient (${mode} mode):`, currentPatientId);
        await api.patients.update(currentPatientId, patientData);
        toast({ title: "Success", description: "Patient information updated successfully" });
        onSuccess();
      } else {
        console.log(`Creating new patient (${mode} mode)...`);
        const createPayload = { ...patientData };
        delete createPayload.profile_photo_url;
        delete createPayload.signature_url;
        delete createPayload.documents;
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
            // createPayload.allergies = null; // Field removed/replaced
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
        const newPatient = await api.patients.create(createPayload as any);
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

  // onSubmit is now ONLY for simplified mode (called by form.handleSubmit)
  const onSubmit = (data: PatientFormValues) => {
     if (isSimplifiedMode) {
       performSave(data);
     } else {
       // This part should ideally not be reached if validation is handled manually before
       console.warn("onSubmit called unexpectedly in full mode");
     }
  };

  // New handler for the Save Changes button click in full mode
  const handleSaveChangesClick = async () => {
    if (isSimplifiedMode) return; // Should not happen, button is different

    setLoading(true); // Show loading state early

    const fieldsToValidate = tabToFields[activeTab] || [];
    console.log(`Validating fields for tab "${activeTab}":`, fieldsToValidate);

    if (fieldsToValidate.length === 0 && activeTab !== 'documents') { // Documents might have no required fields initially
        console.warn(`No fields defined for validation on tab: ${activeTab}`);
        // Decide if we should proceed or show an error. Let's proceed for now.
    }

    // Trigger validation only for the fields of the current tab
    const isValid = fieldsToValidate.length > 0
        ? await form.trigger(fieldsToValidate as any) // Cast needed as trigger expects specific field names
        : true; // Assume valid if no fields defined for the tab (e.g., documents initially)

    if (isValid) {
      console.log(`Validation passed for tab: ${activeTab}`);
      const currentData = form.getValues() as FullPatientFormValues;
      setPendingSubmitData(currentData);
      // Reset dialog fields before opening
      setDialogAcknowledgment(false);
      // Pre-fill signature from existing patient data if available, otherwise blank
      setDialogSignature(currentData.patient_signature_consent || '');
      setDialogConsentDate(new Date()); // Reset to today
      setIsConfirmDialogOpen(true);
    } else {
      console.log(`Validation failed for tab: ${activeTab}`);
      toast({
        title: "Validation Error",
        description: `Please fix the errors on the "${activeTab.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}" tab before saving.`,
        variant: "destructive",
      });
    }
     setLoading(false); // Hide loading state after validation attempt
  };

  // Handler for confirming the dialog and saving
  const handleConfirmAndSave = () => {
    // Check if acknowledgment in dialog is ticked
    if (dialogAcknowledgment && pendingSubmitData) {
      // Merge dialog data into pendingSubmitData before saving
      const finalData = {
        ...pendingSubmitData,
        acknowledgment: dialogAcknowledgment,
        patient_signature_consent: dialogSignature,
        consent_date: dialogConsentDate || new Date(), // Use current date if null
        consent_given: dialogAcknowledgment, // Link consent_given to acknowledgment
      };
      performSave(finalData);
      setIsConfirmDialogOpen(false);
      setPendingSubmitData(null);
    } else {
      toast({
        title: "Acknowledgment Required",
        description: "Please acknowledge and provide signature/date in the dialog to save.",
        variant: "destructive",
      });
    }
  };

  const handleNextTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const handlePreviousTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  return (
    <FormProvider {...form}>
      {/* Use a div instead of form for onSubmit to prevent direct submission in full mode */}
      <div className="space-y-6">
        {isSimplifiedMode ? (
          // --- Simplified Mode UI ---
          // Wrap simplified form in its own form tag for direct submission
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6 pt-6 max-h-[calc(90vh-200px)] overflow-y-auto p-1">
              <div className="space-y-2">
                  <h3 className="text-lg font-medium">Basic Patient Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the essential details for the new patient.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="first_name" render={({ field }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="middle_name" render={({ field }) => ( <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input placeholder="Michael" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="last_name" render={({ field }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="age" render={({ field }) => ( <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="25" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="occupation" render={({ field }) => ( <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
             {/* Buttons for simplified mode */}
             <div className="flex justify-end gap-2 pt-4">
               <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
               <Button type="submit" disabled={loading}>
                 {loading ? (<><span className="mr-2">Saving...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Save Changes')}
               </Button>
             </div>
          </form>
        ) : (
          // --- Full Mode UI (Tabs) ---
          <div className="pt-6">
            {/* Control Tabs component value and onValueChange */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                {/* Map through tabOrder to create triggers */}
                {tabOrder.map(tabValue => (
                  <TabsTrigger key={tabValue} value={tabValue}>
                    {/* Simple title generation */}
                    {tabValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* Keep existing TabsContent structure, ensure values match tabOrder */}
              <TabsContent value="personal" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                <PatientPersonalInfoForm />
              </TabsContent>
              <TabsContent value="contact" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                 <PatientContactInfoForm />
              </TabsContent>
              <TabsContent value="medical" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1 space-y-8">
                <PatientMedicalInfoForm />
              </TabsContent>
              <TabsContent value="dental" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1 space-y-8">
                <PatientDentalHistoryForm />
              </TabsContent>
              <TabsContent value="family_lifestyle" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1 space-y-8">
                <PatientFamilyHistoryForm />
                <PatientLifestyleForm />
              </TabsContent>
               {/* Consent Tab Content Removed */}
              <TabsContent value="documents" className="max-h-[calc(90vh-250px)] overflow-y-auto p-1">
                <PatientDocumentsForm />
              </TabsContent>
            </Tabs>
             {/* Buttons for full mode - outside Tabs component */}
             <div className="flex justify-between gap-2 pt-4">
                <div> {/* Group Previous/Next buttons */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreviousTab}
                    disabled={tabOrder.indexOf(activeTab) === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNextTab}
                    disabled={tabOrder.indexOf(activeTab) === tabOrder.length - 1}
                    className="ml-2" // Add margin between prev/next
                  >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div> {/* Group Cancel/Save buttons */}
                  <Button type="button" variant="outline" onClick={onCancel} className="mr-2">Cancel</Button>
                  {/* Button now calls handleSaveChangesClick for manual validation */}
                  <Button type="button" onClick={handleSaveChangesClick} disabled={loading}>
                    {loading ? (<><span className="mr-2">Validating...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Save Changes')}
                  </Button>
                </div>
             </div>
          </div>
        )}
      </div> {/* Close the outer div */}

      {/* Confirmation Dialog - Now always shows consent fields */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
              <DialogTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" /> Consent & Acknowledgment
              </DialogTitle>
              <DialogDescription>
                Please review, acknowledge, and sign below before saving the patient information.
              </DialogDescription>
          </DialogHeader>

          {/* Consent Fields moved into Dialog */}
          <div className="space-y-4 py-4">
             {/* --- Acknowledgment Checkbox --- */}
             <div className="flex items-start space-x-3 rounded-md border p-4 shadow-sm">
                <Checkbox
                    id="dialog-acknowledgment"
                    checked={dialogAcknowledgment}
                    onCheckedChange={(checked) => setDialogAcknowledgment(checked === true)}
                    className="mt-1" // Align checkbox better with text
                />
                <div className="grid gap-1.5 leading-none">
                   <label
                     htmlFor="dialog-acknowledgment"
                     className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                   >
                     I confirm that the information provided is complete and accurate to the best of my knowledge.
                   </label>
                   {!dialogAcknowledgment && ( // Show warning if not checked
                      <p className="text-sm text-destructive">Acknowledgment is required.</p>
                   )}
                </div>
             </div>

             {/* --- Signature Input --- */}
             <div className="space-y-2">
                <Label htmlFor="dialog-signature">Patient Signature (Type full name)</Label>
                <Input
                  id="dialog-signature"
                  placeholder="Type your full name"
                  value={dialogSignature}
                  onChange={(e) => setDialogSignature(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Typing your name here acts as your digital signature.
                </p>
             </div>

             {/* --- Date Input --- */}
             <div className="space-y-2">
                <Label htmlFor="dialog-consent-date">Date</Label>
                <Input
                  id="dialog-consent-date"
                  type="date"
                  value={dialogConsentDate ? dialogConsentDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDialogConsentDate(e.target.value ? new Date(e.target.value) : null)}
                />
             </div>
          </div>


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={!dialogAcknowledgment || loading} // Disable if not acknowledged or already loading
            >
              {loading ? (<><span className="mr-2">Saving...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Confirm & Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </FormProvider>
  );
}
