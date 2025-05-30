import React, { useState, useEffect, useCallback, useRef } from 'react'; // Add useRef
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
import { api } from '@/lib/api'; // Assuming api.patients.saveToothConditions will be added here
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Patient, PatientInsert, BloodGroup, Gender, MaritalStatus, Json } from '@/types'; // <<< Import PatientInsert
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
// Import the map type and condition type
import { ToothConditionsMap } from '@/features/treatment-plans/components/ToothSelector';
import { ToothCondition } from '@/features/treatment-plans/components/DentalChart'; // <<< Import ToothCondition
// Import the insert type for the API call - Assuming it's exported from api.ts or types/index.ts
// If not, we might need to define it here or import from the correct location.
// Let's assume it's in types/index.ts for now.
import { PatientToothConditionInsert } from '@/types';
import { ControllerRenderProps } from 'react-hook-form'; // Import ControllerRenderProps
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
  // Remove dentalChartRef
  // const dentalChartRef = useRef<DentalChartHandle>(null);
  // State for fields inside the dialog
  const [dialogAcknowledgment, setDialogAcknowledgment] = useState(false);
  const [dialogSignature, setDialogSignature] = useState('');
  const [dialogConsentDate, setDialogConsentDate] = useState<Date | null>(new Date());
  // ---
  const [pendingSubmitData, setPendingSubmitData] = useState<FullPatientFormValues | null>(null);
  const [activeTab, setActiveTab] = useState(tabOrder[0]);
  // Removed formDefaultValues and isDefaultValuesLoading states
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true); // New state to track initial loading for button disabling
   // isConsentSubmission state is no longer needed as dialog always shows consent
   // --- Moved isSimplifiedMode declaration before calculateDefaultValues ---
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
    // Initialize selected teeth map
    dh_selected_teeth: {},
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
   // --- Ensure isSimplifiedMode is accessible here ---
   // Renamed function slightly as it's now used directly in useEffect
   const getBaseDefaultValues = useCallback((currentPatient: Patient | null | undefined): Partial<PatientFormValues> => {
     const baseDefaults = isSimplifiedMode ? simplifiedDefaultValues : fullDefaultValues;
     const patientOverrides: Partial<PatientFormValues> = currentPatient ? {
        first_name: currentPatient.first_name || '',
        last_name: currentPatient.last_name || '',
        middle_name: currentPatient.middle_name || '',
        // Ensure gender matches the specific enum type or undefined (as per schema)
        gender: (currentPatient.gender === 'male' || currentPatient.gender === 'female' || currentPatient.gender === 'other') ? currentPatient.gender : undefined,
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
          // Removed consent_notes as it doesn't exist on the Patient type
           // Map detailed history/etc. from JSONB fields if they exist, EXCLUDING dh_selected_teeth
           ...(currentPatient.dental_history && typeof currentPatient.dental_history === 'object' ? { ...Object.fromEntries(Object.entries(currentPatient.dental_history as object).filter(([key]) => key !== 'dh_selected_teeth')) } : {}), // Ensure dh_selected_teeth is NEVER mapped here
           ...(currentPatient.family_medical_history && typeof currentPatient.family_medical_history === 'object' ? { ...(currentPatient.family_medical_history as object) } : {}),
             // Explicitly map lifestyle habits with safe defaults (use '' for strings, undefined for optional enums/radios)
             diet_description: (currentPatient.lifestyle_habits as any)?.diet ?? '', // Use '' for textarea
             exercise_frequency: (currentPatient.lifestyle_habits as any)?.exercise ?? undefined, // Use undefined for optional enum
             stress_level: (currentPatient.lifestyle_habits as any)?.stress ?? undefined, // Use undefined for optional enum
             // Handle potential string 'Yes, details missing' or 'No' from DB
            has_sleep_issues: (currentPatient.lifestyle_habits as any)?.sleep_issues?.startsWith('Yes') ? 'yes' : ((currentPatient.lifestyle_habits as any)?.sleep_issues === 'No' ? 'no' : null), // null is ok
            sleep_issues_details: (currentPatient.lifestyle_habits as any)?.sleep_issues?.startsWith('Yes')
                 ? ((currentPatient.lifestyle_habits as any)?.sleep_issues.replace('Yes, ', '') !== 'details missing' ? (currentPatient.lifestyle_habits as any)?.sleep_issues.replace('Yes, ', '') : '')
                 : '', // Use '' for input
             pregnancy_status: (currentPatient.lifestyle_habits as any)?.pregnancy_status ?? undefined, // Use undefined for optional enum
             pregnancy_comments: (currentPatient.lifestyle_habits as any)?.pregnancy_comments ?? '', // Use '' for textarea
             has_mental_health_conditions: (currentPatient.lifestyle_habits as any)?.mental_health?.startsWith('Yes') ? 'yes' : ((currentPatient.lifestyle_habits as any)?.mental_health === 'No' ? 'no' : undefined), // Use undefined for optional enum
             mental_health_details: (currentPatient.lifestyle_habits as any)?.mental_health?.startsWith('Yes')
                 ? ((currentPatient.lifestyle_habits as any)?.mental_health.replace('Yes, ', '') !== 'details missing' ? (currentPatient.lifestyle_habits as any)?.mental_health.replace('Yes, ', '') : '')
                : '', // Use '' for textarea
             additional_concerns: (currentPatient.lifestyle_habits as any)?.additional_concerns ?? '', // Use '' for textarea
             additional_comments: (currentPatient.lifestyle_habits as any)?.additional_comments ?? '', // Use '' for textarea
          }) // Close the !isSimplifiedMode block here
      } : {}; // Close the currentPatient ternary

     // --- Fetching selected teeth is handled in useEffect ---

     // --- Correctly return the merged object ---
     // NOTE: dh_selected_teeth will be merged in the useEffect that calls form.reset
     return {
       ...baseDefaults,
       ...patientOverrides,
     };
   }, [patient, isSimplifiedMode]);

   // Removed updateChartDataInFormState function


  // Use the full schema for the resolver
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(isSimplifiedMode ? simplifiedPatientSchema : patientSchema),
    // Default values are now set via form.reset in useEffect
    defaultValues: isSimplifiedMode ? simplifiedDefaultValues : fullDefaultValues,
    mode: 'onChange',
  });

  // Combined useEffect for calculating defaults, fetching teeth, and resetting the form
  useEffect(() => {
    setIsLoadingDefaults(true); // Start loading indicator
    console.log(`PatientForm: useEffect triggered. Patient ID: ${patient?.id}, Mode: ${mode}`);

    const loadAndResetForm = async () => {
      // 1. Calculate base default values
      let defaults = getBaseDefaultValues(patient);
      console.log("PatientForm: Base defaults calculated:", JSON.stringify(defaults));

      // 2. If editing in full mode, fetch the dental history teeth map
      if (patient?.id && !isSimplifiedMode) {
        try {
          console.log("PatientForm: Fetching dental history teeth map for patient:", patient.id);
          const dentalHistoryTeethMap = await api.patients.getPatientDentalHistoryTeethMap(patient.id);
          console.log("PatientForm: Fetched dental history teeth map for form:", JSON.stringify(dentalHistoryTeethMap));

          // Merge the fetched map into the defaults object
          (defaults as Partial<FullPatientFormValues>).dh_selected_teeth = dentalHistoryTeethMap || {}; // Ensure it's an object

        } catch (error) {
          console.error("Error fetching patient dental history teeth map:", error);
          toast({
            title: "Error Loading Affected Teeth",
            description: "Could not load previously selected affected teeth.",
            variant: "destructive",
          });
          // Ensure field is an empty object in defaults on error
          (defaults as Partial<FullPatientFormValues>).dh_selected_teeth = {};
        }
      } else if (!isSimplifiedMode) {
        // Ensure field is initialized as empty object for new full form
        (defaults as Partial<FullPatientFormValues>).dh_selected_teeth = {};
      } else if (isSimplifiedMode) {
         // Ensure field is not present for simplified mode
         delete (defaults as Partial<FullPatientFormValues>).dh_selected_teeth;
      }

      // 3. Reset the form with the final calculated defaults
      console.log("PatientForm: Resetting form with final defaults:", JSON.stringify(defaults));
      form.reset(defaults);
      console.log("PatientForm: Form reset complete. Checking form state after reset:", JSON.stringify(form.getValues('dh_selected_teeth')));
      setIsLoadingDefaults(false); // Finish loading indicator
    };

    loadAndResetForm();

  // Depend on patient object itself (or patient.id) and mode
  }, [patient, mode, isSimplifiedMode, getBaseDefaultValues, form, toast]); // Added form and toast as dependencies


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

      // Define the type for common data explicitly
      const commonPatientData: {
        first_name: string;
        last_name: string;
        middle_name: string | null;
        gender: Gender | null; // Use Gender type here
        age: number | null;
        occupation: string | null;
        phone: string;
      } = {
        first_name: saveData.first_name || '',
        last_name: saveData.last_name || '',
        middle_name: saveData.middle_name || null,
        // Assign gender based on validation
        gender: (saveData.gender === 'male' || saveData.gender === 'female' || saveData.gender === 'other') ? saveData.gender : null,
        age: saveData.age ?? null,
        occupation: saveData.occupation || null,
        phone: saveData.phone || '',
      };

      let patientData: Partial<Patient>; // Keep as Partial initially

      if (isSimplifiedMode) {
        patientData = commonPatientData; // Assign common data
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
              // Explicitly remove the old tooth_conditions field if it exists
              // dh_tooth_conditions: undefined, // This might not work directly on the constructed object
          } as any, // Use 'any' temporarily to allow deletion
          family_medical_history: {
              conditions: fullData.family_medical_conditions || [],
              other: fullData.family_medical_conditions_other || null,
              dental_issues: fullData.family_dental_issues || [],
              dental_other: fullData.family_dental_issues_other || null,
          },
           lifestyle_habits: {
               diet: fullData.diet_description || null,
               exercise: fullData.exercise_frequency || null, // Keep as is, DB expects enum value or null
               stress: fullData.stress_level || null, // Keep as is
               // Convert back to DB format
               sleep_issues: fullData.has_sleep_issues === 'yes'
                   ? (fullData.sleep_issues_details ? `Yes, ${fullData.sleep_issues_details}` : 'Yes, details missing')
                   : 'No',
               pregnancy_status: fullData.pregnancy_status || null, // Keep as is
               pregnancy_comments: fullData.pregnancy_comments || null,
               // Convert back to DB format
               mental_health: fullData.has_mental_health_conditions === 'yes'
                   ? (fullData.mental_health_details ? `Yes, ${fullData.mental_health_details}` : 'Yes, details missing')
                   : 'No',
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

      let savedPatientId: string | undefined = currentPatientId;
      let newPatient: Patient | null = null; // To store the result of creation

      // Explicitly type patientData before API call
      const finalPatientData: Partial<Patient> = patientData;

      // Clean up the old tooth conditions field from dental_history before saving
      if (finalPatientData.dental_history && typeof finalPatientData.dental_history === 'object') {
        delete (finalPatientData.dental_history as any).dh_tooth_conditions;
        // Ensure the final type is Json after deletion
        finalPatientData.dental_history = finalPatientData.dental_history as Json;
      }


      if (currentPatientId) {
        console.log(`Updating existing patient (${mode} mode):`, currentPatientId);
        await api.patients.update(currentPatientId, finalPatientData); // Use finalPatientData
        // savedPatientId remains currentPatientId
      } else {
        console.log(`Creating new patient (${mode} mode)...`);
        const createPayload = { ...finalPatientData }; // Use finalPatientData
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
        // Ensure createPayload matches PatientInsert type before calling create
        // Explicitly define the type for createPayload based on PatientInsert
        const finalCreatePayload: PatientInsert = {
            // Map common fields ensuring correct types
            first_name: createPayload.first_name || '',
            last_name: createPayload.last_name || '',
            middle_name: createPayload.middle_name || null,
            // Explicitly check gender value to match Gender type or null
            gender: (createPayload.gender === 'male' || createPayload.gender === 'female' || createPayload.gender === 'other') ? createPayload.gender : null,
            age: createPayload.age ?? null,
            occupation: createPayload.occupation || null,
            phone: createPayload.phone || '',
            // Map other fields required/optional by PatientInsert, ensuring null defaults if not present
            marital_status: (createPayload.marital_status as MaritalStatus) || null,
            email: createPayload.email || null,
            address: createPayload.address || null,
            city: createPayload.city || null,
            state: createPayload.state || null,
            postal_code: createPayload.postal_code || null,
            country: createPayload.country || null,
            emergency_contact_name: createPayload.emergency_contact_name || null,
            emergency_contact_phone: createPayload.emergency_contact_phone || null,
            emergency_contact_relationship: createPayload.emergency_contact_relationship || null,
            blood_group: (createPayload.blood_group as BloodGroup) || null,
            height: createPayload.height ?? null,
            weight: createPayload.weight ?? null,
            medical_conditions: createPayload.medical_conditions || null,
            current_medications: createPayload.current_medications || null,
            previous_surgeries: createPayload.previous_surgeries || null,
            detailed_medical_info: createPayload.detailed_medical_info || null,
            dental_history: createPayload.dental_history || null,
            family_medical_history: createPayload.family_medical_history || null,
            lifestyle_habits: createPayload.lifestyle_habits || null,
            notes: createPayload.notes || null,
            consent_given: createPayload.consent_given || null,
            // Ensure fields not in PatientInsert are excluded (like profile_photo_url, signature_url, documents)
        };

        newPatient = await api.patients.create(finalCreatePayload); // Use the correctly typed payload
        if (!newPatient?.id) {
          throw new Error("Failed to create patient or retrieve new patient ID.");
        }
        savedPatientId = newPatient.id; // Update savedPatientId only if newPatient and its id exist
        console.log("New patient created:", savedPatientId);
      }

      // --- Save Patient Dental History Teeth (Simple List - only in full mode) ---
      if (!isSimplifiedMode && savedPatientId) {
          const dentalHistoryTeethMap = (saveData as FullPatientFormValues).dh_selected_teeth; // Get the map from form data

          // Extract just the tooth IDs from the map keys
          const toothIdsToSave: number[] = dentalHistoryTeethMap
            ? Object.keys(dentalHistoryTeethMap).map(Number)
            : [];

          console.log("Saving patient dental history teeth map (with conditions):", JSON.stringify(dentalHistoryTeethMap));
          try {
              // Call the correctly named API function with the map
              await api.patients.savePatientDentalHistoryTeethWithConditions(savedPatientId, dentalHistoryTeethMap);
              console.log("Patient dental history teeth (with conditions) saved successfully.");
          } catch (toothError: any) {
              console.error("Error saving patient dental history teeth:", toothError);
                  toast({
                      title: "Warning",
                      description: `Patient info saved, but failed to save dental history teeth: ${toothError.message}`,
                      variant: "destructive",
                  });
              }
          // No 'else' needed, savePatientDentalHistoryTeeth handles empty array correctly
      }
      // --- End Save Patient Dental History Teeth ---

      // Display success message based on mode and operation type
      const successMessage = currentPatientId
        ? "Patient information updated successfully."
        : (isSimplifiedMode
            ? "Basic patient info saved. Complete profile later."
            : "Patient created successfully. Edit to add documents."); // Keep original creation message logic

      toast({ title: "Success", description: successMessage });
      onSuccess(savedPatientId); // Pass the ID back

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

     // Removed call to updateChartDataInFormState

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
                  <FormField control={form.control} name="first_name" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'first_name'> }) => ( <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="middle_name" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'middle_name'> }) => ( <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input placeholder="Michael" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="last_name" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'last_name'> }) => ( <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="gender" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'gender'> }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="age" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'age'> }) => ( <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="25" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="occupation" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'occupation'> }) => ( <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="phone" render={({ field }: { field: ControllerRenderProps<SimplifiedPatientFormValues, 'phone'> }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
             {/* Buttons for simplified mode */}
             <div className="flex justify-end gap-2 pt-4">
               <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
               {/* Disable submit if initial defaults are still loading */}
               <Button type="submit" disabled={loading || isLoadingDefaults}>
                 {loading ? (<><span className="mr-2">Saving...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : isLoadingDefaults ? (<><span className="mr-2">Loading...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Save Changes')}
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
                {/* Remove dentalChartRef prop */}
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
                  {/* Button now calls handleSaveChangesClick */}
                  {/* Disable save if initial defaults are still loading */}
                  <Button type="button" onClick={handleSaveChangesClick} disabled={loading || isLoadingDefaults}>
                     {loading ? (<><span className="mr-2">Validating...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : isLoadingDefaults ? (<><span className="mr-2">Loading...</span><Loader2 className="h-4 w-4 animate-spin" /></>) : ('Save Changes')}
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
                    onCheckedChange={(checked: boolean | 'indeterminate') => setDialogAcknowledgment(checked === true)} // Add explicit type
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
