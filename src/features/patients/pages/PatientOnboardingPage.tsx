import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useMultiStepForm } from '../hooks/useMultiStepForm';
import { PatientFormProgress } from '../components/PatientFormProgress';
import { 
  PatientPersonalInfoForm, 
  personalInfoSchema 
} from '../components/PatientPersonalInfoForm';
import { 
  PatientContactInfoForm,
  contactInfoSchema 
} from '../components/PatientContactInfoForm';
import { 
  PatientMedicalInfoForm,
  medicalInfoSchema 
} from '../components/PatientMedicalInfoForm';
import { 
  PatientDocumentsForm,
  documentsSchema 
} from '../components/PatientDocumentsForm';

// Combine all the schemas into one
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape,
  ...documentsSchema.shape
});

type PatientFormValues = z.infer<typeof patientSchema>;

export function PatientOnboardingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingFiles, setSavingFiles] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  
  // Set up form steps
  const formSteps = ['Personal Info', 'Contact Info', 'Medical Info', 'Documents'];
  const { currentStepIndex, currentStep, next, back, goTo, isFirstStep, isLastStep } = 
    useMultiStepForm({ steps: formSteps });
  
  // Initialize form with default values
  const methods = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: "male",
      country: "USA",
      marital_status: "single",
      blood_group: "unknown",
      consent_given: false
    }
  });
  
  // Fetch patient data if editing
  useEffect(() => {
    if (id) {
      fetchPatient(id);
    }
  }, [id]);
  
  const fetchPatient = async (patientId: string) => {
    try {
      setLoading(true);
      const data = await api.patients.getById(patientId);
      if (data) {
        setPatient(data);
        
        // Reset form with patient data
        methods.reset({
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name || '',
          gender: data.gender || 'male',
          age: data.age,
          marital_status: data.marital_status || 'single',
          occupation: data.occupation || '',
          phone: data.phone,
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || 'USA',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
          blood_group: data.blood_group || 'unknown',
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          allergies: Array.isArray(data.allergies) ? data.allergies.join(', ') : '',
          medical_conditions: Array.isArray(data.medical_conditions) ? data.medical_conditions.join(', ') : '',
          current_medications: data.current_medications ? 
            (typeof data.current_medications === 'string' ? 
              data.current_medications : JSON.stringify(data.current_medications)) : '',
          notes: data.notes || '',
          consent_given: data.consent_given || false,
          consent_notes: ''
        });
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast({
        title: "Error",
        description: "Failed to load patient information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const onSubmit = async (formData: PatientFormValues) => {
    if (!isLastStep) {
      next();
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert form data to patient data structure
      const patientData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        gender: formData.gender,
        age: formData.age,
        marital_status: formData.marital_status,
        occupation: formData.occupation,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        blood_group: formData.blood_group,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        medical_conditions: formData.medical_conditions ? 
          formData.medical_conditions.split(',').map(c => c.trim()) : [],
        current_medications: formData.current_medications ? 
          JSON.stringify(formData.current_medications) : '[]',
        notes: formData.notes,
        consent_given: formData.consent_given
      };
      
      // Create or update patient record
      let patientId = id;
      if (id) {
        await api.patients.update(id, patientData);
        toast({
          title: "Success",
          description: "Patient information updated successfully"
        });
      } else {
        const newPatient = await api.patients.create(patientData);
        patientId = newPatient.id;
        toast({
          title: "Success",
          description: "Patient created successfully"
        });
      }
      
      // Upload files if provided
      if (patientId && (formData.profile_photo || formData.signature || formData.id_document)) {
        setSavingFiles(true);
        
        try {
          // Upload profile photo
          if (formData.profile_photo) {
            await api.patients.uploadProfilePhoto(formData.profile_photo, patientId);
          }
          
          // Upload signature
          if (formData.signature) {
            await api.patients.uploadSignature(formData.signature, patientId);
          }
          
          // Upload ID document
          if (formData.id_document) {
            await api.patients.addDocument(
              formData.id_document, 
              patientId, 
              'id_document', 
              'Patient ID document'
            );
          }
          
          toast({
            title: "Success",
            description: "Files uploaded successfully"
          });
        } catch (error) {
          console.error('Error uploading files:', error);
          toast({
            title: "Warning",
            description: "Patient saved but there was an error uploading some files",
            variant: "destructive"
          });
        } finally {
          setSavingFiles(false);
        }
      }
      
      // Navigate to patients page
      navigate('/patients');
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "Error",
        description: "Failed to save patient information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Step-specific validation and submission
  const handleStepSubmit = async () => {
    let isValid = false;
    
    // Validate the current step
    if (currentStep === 'Personal Info') {
      isValid = await methods.trigger(['first_name', 'last_name', 'gender', 'age', 'marital_status', 'occupation']);
    } else if (currentStep === 'Contact Info') {
      isValid = await methods.trigger([
        'phone', 'email', 'address', 'city', 'state', 'postal_code', 'country',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
      ]);
    } else if (currentStep === 'Medical Info') {
      isValid = await methods.trigger([
        'blood_group', 'height', 'weight', 'allergies', 'medical_conditions', 
        'current_medications', 'notes'
      ]);
    } else if (currentStep === 'Documents') {
      isValid = await methods.trigger([
        'consent_given', 'profile_photo', 'signature', 'id_document', 'consent_notes'
      ]);
    }
    
    if (isValid) {
      if (isLastStep) {
        await methods.handleSubmit(onSubmit)();
      } else {
        next();
      }
    }
  };
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'Personal Info':
        return <PatientPersonalInfoForm />;
      case 'Contact Info':
        return <PatientContactInfoForm />;
      case 'Medical Info':
        return <PatientMedicalInfoForm />;
      case 'Documents':
        return <PatientDocumentsForm />;
      default:
        return null;
    }
  };
  
  if (loading && !patient && id) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {id ? 'Update Patient Information' : 'New Patient Registration'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {id ? 'Update the patient\'s profile information' : 'Register a new patient in the system'}
            </p>
          </div>
        </div>
        
        <PatientFormProgress 
          steps={formSteps} 
          currentStepIndex={currentStepIndex} 
          onChange={goTo}
        />
        
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {renderCurrentStep()}
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-4">
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={back}>
                  Back
                </Button>
              )}
              
              <Button
                type="button"
                onClick={handleStepSubmit}
                disabled={loading || savingFiles}
              >
                {(loading || savingFiles) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLastStep ? (id ? 'Update' : 'Create') : 'Next'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}