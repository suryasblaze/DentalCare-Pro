import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useMultiStepForm } from "../hooks/useMultiStepForm";
import { Patient, Gender, MaritalStatus, BloodGroup, Json, PatientDocument } from "@/types"; // Import PatientDocument
import { PatientFormProgress } from "../components/PatientFormProgress";
import { PatientPersonalInfoForm, personalInfoSchema } from '../components/PatientPersonalInfoForm';
import { PatientContactInfoForm, contactInfoSchema } from '../components/PatientContactInfoForm';
import { PatientMedicalInfoForm, medicalInfoSchema } from '../components/PatientMedicalInfoForm';
import { PatientDentalHistoryForm, dentalHistorySchema } from '../components/PatientDentalHistoryForm';
import { PatientFamilyHistoryForm, familyHistorySchema } from '../components/PatientFamilyHistoryForm';
import { PatientLifestyleForm, lifestyleSchema } from '../components/PatientLifestyleForm';
import { PatientConsentForm, consentSchema } from '../components/PatientConsentForm';
import { PatientDocumentsForm, documentsSchema } from "../components/PatientDocumentsForm";
import { supabase } from '@/lib/supabase'; // Import supabase for upload function

// Combine all schemas for the multi-step form
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape,
  ...dentalHistorySchema.shape,
  ...familyHistorySchema.shape,
  ...lifestyleSchema.shape,
  ...consentSchema.shape,
  ...documentsSchema.shape,
});

// Type for the entire multi-step form
type PatientFormValues = z.infer<typeof patientSchema>;

// Schema for initial creation (Personal + Contact)
const initialPatientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
});
type InitialPatientFormValues = z.infer<typeof initialPatientSchema>;


export function PatientOnboardingPage() {
  const { id } = useParams<{ id?: string }>(); // Optional id param
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingFiles, setSavingFiles] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(id || null);

  const formSteps = [
    'Personal Info', 'Contact Info', 'Medical Info', 'Dental History',
    'Family History', 'Lifestyle', 'Consent', 'Documents'
  ];
  const { currentStepIndex, currentStep, next, back, goTo, isFirstStep, isLastStep } =
    useMultiStepForm({ steps: formSteps });

  const formatArrayToString = useCallback((value: any): string => {
    if (Array.isArray(value)) { return value.join(', '); }
    return String(value ?? '');
  }, []);

  // Define initial default values for the entire form
  const initialDefaultValues: PatientFormValues = {
    // Personal Info
    first_name: '', last_name: '', middle_name: '', gender: 'male', age: undefined,
    marital_status: 'single', occupation: '',
    // Contact Info
    phone: '', email: '', address: '', city: '', state: '', postal_code: '', country: 'USA',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    // Medical Info
    blood_group: 'unknown', height: '', weight: '', has_allergies: 'no', allergies_details: '',
    diagnosed_conditions: [], other_diagnosed_condition: '', has_implants: 'no', implants_details: '',
    taking_medications: 'no', medications_details: '', recent_health_changes: 'no', health_changes_details: '',
    past_surgeries_hospitalizations: '', immunizations_up_to_date: 'not_sure', recent_immunizations: '',
    recent_medical_screenings: 'no', screenings_details: '', dental_material_allergies: 'no',
    dental_material_allergies_details: '', notes: '',
    // Dental History
    dh_reason_for_visit: undefined, dh_reason_for_visit_other: "", dh_chief_complaint: "",
    dh_has_pain: "no", dh_pain_description: "", dh_pain_scale: undefined, dh_pain_duration_onset: "",
    dh_past_treatments_details: "", dh_treatment_dates: "", dh_treatment_outcomes: "", dh_follow_up_treatments: "",
    dh_brushing_frequency: undefined, dh_flossing_habits: undefined, dh_additional_hygiene_products: "",
    dh_technique_tools: "", dh_orthodontic_history: "no", dh_orthodontic_details: "", dh_has_records: "no",
    dh_xray_frequency: "", dh_bite_issues: "no", dh_bite_symptoms: "", dh_cosmetic_concerns: "no",
    dh_cosmetic_issues_details: "", dh_functional_concerns: "", dh_emergency_history: "no",
    dh_emergency_details: "", dh_additional_summary: "", dh_future_goals: "",
    // Family History
    fh_medical_conditions: [], fh_medical_conditions_other: "", fh_dental_issues: [], fh_dental_issues_other: "",
    // Lifestyle
    ls_diet_description: "", ls_exercise_frequency: undefined, ls_stress_level: undefined,
    ls_has_sleep_issues: "no", ls_sleep_issues_details: "", ls_pregnancy_status: "not_applicable",
    ls_pregnancy_comments: "", ls_has_mental_health_conditions: "no", ls_mental_health_details: "",
    ls_additional_concerns: "", ls_additional_comments: "",
    // Consent
    cn_acknowledgment: false, cn_patient_signature: "", cn_consent_date: new Date(),
    // Documents
    consent_given: false, consent_notes: "", profile_photo: undefined, signature: undefined, id_document: undefined,
  };

  // Calculate default values based on patient prop or initial defaults
  const calculateDefaultValues = useCallback((currentPatient: Patient | null | undefined): Partial<PatientFormValues> => {
    const baseDefaults = { ...initialDefaultValues }; // Start with base defaults
    if (!currentPatient) return baseDefaults;

    // Override with patient data if available
    return {
      ...baseDefaults,
      // Personal Info
      first_name: currentPatient.first_name || '',
      last_name: currentPatient.last_name || '',
      middle_name: currentPatient.middle_name || '',
      gender: currentPatient.gender || 'male',
      age: currentPatient.age ?? undefined, // Use undefined for age
      marital_status: currentPatient.marital_status || 'single',
      occupation: currentPatient.occupation || '',
      // Contact Info
      phone: currentPatient.phone || '',
      email: currentPatient.email || '',
      address: currentPatient.address || '',
      city: currentPatient.city || '',
      state: currentPatient.state || '',
      postal_code: currentPatient.postal_code || '',
      country: currentPatient.country || 'USA',
      emergency_contact_name: currentPatient.emergency_contact_name || '',
      emergency_contact_phone: currentPatient.emergency_contact_phone || '',
      emergency_contact_relationship: currentPatient.emergency_contact_relationship || '',
      // Medical Info (Core)
      blood_group: currentPatient.blood_group || 'unknown',
      height: currentPatient.height ? String(currentPatient.height) : '',
      weight: currentPatient.weight ? String(currentPatient.weight) : '',
      has_allergies: currentPatient.allergies && currentPatient.allergies.length > 0 ? "yes" : "no",
      allergies_details: formatArrayToString(currentPatient.allergies),
      diagnosed_conditions: Array.isArray(currentPatient.medical_conditions) ? currentPatient.medical_conditions : [],
      taking_medications: currentPatient.current_medications ? "yes" : "no",
      medications_details: formatArrayToString(currentPatient.current_medications),
      notes: currentPatient.notes || '',
      // Documents
      consent_given: currentPatient.consent_given || false,
      consent_notes: currentPatient.consent_notes || "",
      // Fields not directly in Patient type remain as initial defaults
    };
  }, [formatArrayToString]);

  const methods = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: calculateDefaultValues(patient)
  });

  useEffect(() => {
    if (id) {
      fetchPatient(id);
    } else {
      // Reset to initial defaults if creating new patient
      methods.reset(initialDefaultValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Dependency on id only

  // Effect to reset form when patient data is fetched or changes
   useEffect(() => {
     methods.reset(calculateDefaultValues(patient));
   }, [patient, methods.reset, calculateDefaultValues]);


  const fetchPatient = async (patientId: string) => {
    setLoading(true);
    try {
      const fetchedData = await api.patients.getById(patientId);
      if (fetchedData) {
        setPatient(fetchedData as Patient); // Set patient state, triggers the reset useEffect
      } else {
        toast({ title: "Error", description: "Patient not found.", variant: "destructive" });
        navigate("/patients"); // Redirect if patient not found
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast({ title: "Error", description: "Failed to load patient information", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePartialSave = async () => {
    const isValidPersonalInfo = await methods.trigger(['first_name', 'last_name', 'gender', 'age', 'marital_status', 'occupation']);
    const isValidContactInfo = await methods.trigger([
      'phone', 'email', 'address', 'city', 'state', 'postal_code', 'country',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
    ]);

    if (!isValidPersonalInfo || !isValidContactInfo) {
      toast({ title: "Validation Error", description: "Please fill required Personal & Contact Info.", variant: "destructive" });
      if (!isValidPersonalInfo && currentStepIndex > 0) goTo(0);
      else if (!isValidContactInfo && currentStepIndex > 1) goTo(1);
      return;
    }

    const formData = methods.getValues();
    const partialData: Partial<Patient> = {
        first_name: formData.first_name!, last_name: formData.last_name!,
        middle_name: formData.middle_name || undefined, gender: formData.gender as Gender,
        age: formData.age ? parseInt(String(formData.age), 10) : null,
        marital_status: formData.marital_status as MaritalStatus, occupation: formData.occupation || undefined,
        phone: formData.phone!, email: formData.email || undefined, address: formData.address || undefined,
        city: formData.city || undefined, state: formData.state || undefined, postal_code: formData.postal_code || undefined,
        country: formData.country || undefined, emergency_contact_name: formData.emergency_contact_name || undefined,
        emergency_contact_phone: formData.emergency_contact_phone || undefined,
        emergency_contact_relationship: formData.emergency_contact_relationship || undefined,
    };

    setIsSubmitting(true); setLoading(true);
    try {
      const newPatientData = await api.patients.create(partialData as any); // Cast needed if API expects specific type
      const newPatient: Patient = newPatientData as Patient;
      setCreatedPatientId(newPatient.id);
      setPatient(newPatient); // Update patient state which triggers reset useEffect
      toast({ title: "Patient Created", description: "Personal and contact details saved." });
      next();
    } catch (error) {
      console.error('Error creating patient partially:', error);
      toast({ title: "Error", description: "Failed to create patient.", variant: "destructive" });
    } finally {
      setIsSubmitting(false); setLoading(false);
    }
  };

  const triggerCurrentStepValidation = async (): Promise<boolean> => {
     let fieldsToValidate: (keyof PatientFormValues)[] = [];
     switch (currentStep) {
       case 'Personal Info': fieldsToValidate = ['first_name', 'last_name', 'gender', 'age', 'marital_status', 'occupation']; break;
       case 'Contact Info': fieldsToValidate = ['phone', 'email', 'address', 'city', 'state', 'postal_code', 'country', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']; break;
       case 'Medical Info': fieldsToValidate = ['blood_group', 'height', 'weight', 'has_allergies', 'diagnosed_conditions', 'other_diagnosed_condition', 'has_implants', 'taking_medications', 'recent_health_changes', 'past_surgeries_hospitalizations', 'immunizations_up_to_date', 'recent_immunizations', 'recent_medical_screenings', 'dental_material_allergies']; break;
       case 'Dental History': fieldsToValidate = ['dh_reason_for_visit', 'dh_chief_complaint', 'dh_has_pain', 'dh_past_treatments_details', 'dh_brushing_frequency', 'dh_flossing_habits', 'dh_orthodontic_history', 'dh_bite_issues', 'dh_cosmetic_concerns', 'dh_functional_concerns', 'dh_emergency_history']; break;
       case 'Family History': fieldsToValidate = ['fh_medical_conditions', 'fh_dental_issues']; break;
       case 'Lifestyle': fieldsToValidate = ['ls_diet_description', 'ls_exercise_frequency', 'ls_stress_level', 'ls_has_sleep_issues', 'ls_pregnancy_status', 'ls_has_mental_health_conditions', 'ls_additional_concerns', 'ls_additional_comments']; break;
       case 'Consent': fieldsToValidate = ['cn_acknowledgment', 'cn_patient_signature', 'cn_consent_date']; break;
       case 'Documents': fieldsToValidate = ['consent_given', 'profile_photo', 'signature', 'id_document', 'consent_notes']; break;
       default: return Promise.resolve(true);
     }
     if (fieldsToValidate.length > 0) { return await methods.trigger(fieldsToValidate); }
     return true;
  };

  const uploadFile = async (file: File, patientId: string, fieldName: string): Promise<PatientDocument | null> => {
    if (!(file instanceof File)) { return null; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { throw new Error("Auth failed."); }
    const fileExt = file.name.split('.').pop();
    const filePath = `public/${patientId}/${fieldName}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('medical-records').upload(filePath, file);
    if (uploadError) { throw new Error(`Upload failed: ${uploadError.message}`); }
    const { data: urlData } = supabase.storage.from('medical-records').getPublicUrl(filePath);
    if (!urlData?.publicUrl) { throw new Error(`Failed to get URL.`); }
    return { path: filePath, url: urlData.publicUrl, name: file.name, type: fieldName, size: file.size, uploaded_at: new Date().toISOString() };
  };

  const onSubmit = async (formData: PatientFormValues) => {
    if (!isLastStep && !createdPatientId) {
       const isValid = await triggerCurrentStepValidation();
       if (isValid) next();
       return;
    }

    setIsSubmitting(true); setLoading(true);
    try {
      const patientIdToUpdate = createdPatientId || id;
      if (!patientIdToUpdate) {
        throw new Error("Patient ID is missing. Cannot save.");
      }

      let documents: PatientDocument[] = (patient?.documents as PatientDocument[]) || [];
      let profilePhotoUrl = patient?.profile_photo_url || null;
      let signatureUrl = patient?.signature_url || null;

      // Handle file uploads only if updating existing patient
      if (data.profile_photo instanceof File) {
          const uploadedDoc = await uploadFile(data.profile_photo, patientIdToUpdate, 'profile_photo');
          if (uploadedDoc) { profilePhotoUrl = uploadedDoc.url; documents = documents.filter(doc => doc.type !== 'profile_photo'); documents.push(uploadedDoc); }
      }
      if (data.signature instanceof File) {
          const uploadedDoc = await uploadFile(data.signature, patientIdToUpdate, 'signature');
          if (uploadedDoc) { signatureUrl = uploadedDoc.url; documents = documents.filter(doc => doc.type !== 'signature'); documents.push(uploadedDoc); }
      }
      if (data.id_document instanceof File) {
          const uploadedDoc = await uploadFile(data.id_document, patientIdToUpdate, 'id_document');
          if (uploadedDoc) { documents = documents.filter(doc => doc.type !== 'id_document'); documents.push(uploadedDoc); }
      }

      const stringToArray = (value: string | undefined | null): string[] | null => {
          if (!value || typeof value !== 'string') return null;
          const arr = value.split(',').map(item => item.trim()).filter(Boolean);
          return arr.length > 0 ? arr : null;
      };

      // Map form data ONLY to fields existing in the Patient type
      const patientData: Partial<Patient> = {
        first_name: formData.first_name!, last_name: formData.last_name!,
        middle_name: formData.middle_name || null, gender: formData.gender as Gender || null,
        age: formData.age ? parseInt(String(formData.age), 10) : null,
        marital_status: formData.marital_status as MaritalStatus || null,
        occupation: formData.occupation || null, phone: formData.phone!, email: formData.email || null,
        address: formData.address || null, city: formData.city || null, state: formData.state || null,
        postal_code: formData.postal_code || null, country: formData.country || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
        blood_group: formData.blood_group as BloodGroup || null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        allergies: formData.has_allergies === 'yes' ? stringToArray(formData.allergies_details) : null,
        medical_conditions: [
          ...(formData.diagnosed_conditions || []),
          ...(formData.other_diagnosed_condition ? [formData.other_diagnosed_condition] : [])
        ].length > 0 ? [
          ...(formData.diagnosed_conditions || []),
          ...(formData.other_diagnosed_condition ? [formData.other_diagnosed_condition] : [])
        ] : null,
        current_medications: formData.taking_medications === 'yes' ? formData.medications_details || null : null,
        notes: formData.notes || null,
        consent_given: formData.consent_given || null,
        consent_notes: formData.consent_notes || null, // Include consent notes
        profile_photo_url: profilePhotoUrl,
        signature_url: signatureUrl,
        documents: documents as Json, // Cast documents array to Json for Supabase
      };

      await api.patients.update(patientIdToUpdate, patientData);
      toast({ title: "Success", description: `Patient information saved successfully.` });

      // Only show notice if updating, as new patient creation doesn't involve these fields yet
       if (id) {
           toast({
               title: "Notice",
               description: "Detailed Dental, Family, Lifestyle, and Consent information is collected but not saved to the database in this version.",
               variant: "default", duration: 9000,
           });
       }

      navigate("/patients"); // Navigate after successful save

    } catch (error: any) {
      console.error('Error saving patient:', error);
      toast({ title: "Error", description: error.message || "Failed to save patient information", variant: "destructive" });
    } finally {
      setIsSubmitting(false); setLoading(false);
    }
  };

  const handleNextClick = async () => {
    if (isLastStep) {
      await methods.handleSubmit(onSubmit)();
    } else {
      const isValid = await triggerCurrentStepValidation();
      if (isValid) {
        // If it's the Contact Info step and we don't have an ID yet, perform partial save
        if (currentStepIndex === 1 && !createdPatientId && !id) {
          await handlePartialSave(); // This function now calls next() on success
        } else {
          next(); // Otherwise, just move to the next step
        }
      } else {
         toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" });
      }
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'Personal Info': return <PatientPersonalInfoForm />;
      case 'Contact Info': return <PatientContactInfoForm />;
      case 'Medical Info': return <PatientMedicalInfoForm />;
      case 'Dental History': return <PatientDentalHistoryForm />;
      case 'Family History': return <PatientFamilyHistoryForm />;
      case 'Lifestyle': return <PatientLifestyleForm />;
      case 'Consent': return <PatientConsentForm />;
      case 'Documents': return <PatientDocumentsForm />;
      default: return null;
    }
  };

  if (loading && id && !patient) { // Show loading only when fetching existing patient
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{id ? 'Update Patient Information' : 'New Patient Registration'}</h1>
          <p className="text-sm text-muted-foreground">{id ? 'Update the patient\'s profile information' : 'Register a new patient in the system'}</p>
        </div>
        <PatientFormProgress steps={formSteps} currentStepIndex={currentStepIndex} onChange={goTo} />
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {renderCurrentStep()}
              </CardContent>
            </Card>
            <div className="flex justify-end gap-4">
              {!isFirstStep && (<Button type="button" variant="outline" onClick={back}>Back</Button>)}
              {/* Show Save & Continue only on Contact step for NEW patients */}
              {currentStepIndex === 1 && !id && !createdPatientId && (
                <Button type="button" variant="secondary" onClick={handlePartialSave} disabled={isSubmitting || savingFiles}>
                  {(isSubmitting && !savingFiles) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Patient & Continue
                </Button>
              )}
              {/* Standard Next/Submit Button */}
              {/* Hide Next button on Contact step for NEW patients if Save & Continue is shown */}
              {!(currentStepIndex === 1 && !id && !createdPatientId) && (
                 <Button type="button" onClick={handleNextClick} disabled={isSubmitting || savingFiles}>
                   {(isSubmitting || savingFiles) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isLastStep ? (createdPatientId || id ? 'Update Patient' : 'Create Patient') : 'Next'}
                 </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
