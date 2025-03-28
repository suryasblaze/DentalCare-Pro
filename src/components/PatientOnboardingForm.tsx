import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { 
  PatientPersonalInfoForm,
  personalInfoSchema 
} from '@/features/patients/components/PatientPersonalInfoForm';
import { 
  PatientContactInfoForm,
  contactInfoSchema 
} from '@/features/patients/components/PatientContactInfoForm';
import { 
  PatientMedicalInfoForm,
  medicalInfoSchema 
} from '@/features/patients/components/PatientMedicalInfoForm';
import { 
  PatientDocumentsForm,
  documentsSchema 
} from '@/features/patients/components/PatientDocumentsForm';
import { z } from 'zod';

// Combine all schemas
const patientSchema = z.object({
  ...personalInfoSchema.shape,
  ...contactInfoSchema.shape,
  ...medicalInfoSchema.shape,
  ...documentsSchema.shape
});

interface PatientOnboardingFormProps {
  patient?: any;
  onSuccess: () => void;
}

function PatientOnboardingForm({ patient, onSuccess }: PatientOnboardingFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const defaultValues = {
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    middle_name: patient?.middle_name || '',
    gender: patient?.gender || 'male',
    age: patient?.age || null,
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
    height: patient?.height || '',
    weight: patient?.weight || '',
    allergies: patient?.allergies ? (Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies) : '',
    medical_conditions: patient?.medical_conditions ? (Array.isArray(patient.medical_conditions) ? patient.medical_conditions.join(', ') : patient.medical_conditions) : '',
    current_medications: patient?.current_medications || '',
    notes: patient?.notes || '',
    consent_given: patient?.consent_given || false,
  };

  const form = useForm<any>({
    resolver: zodResolver(patientSchema),
    defaultValues
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const patientData = {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        gender: data.gender,
        age: data.age,
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
        height: data.height,
        weight: data.weight,
        allergies: data.allergies ? data.allergies.split(',').map((item: string) => item.trim()) : [],
        medical_conditions: data.medical_conditions ? data.medical_conditions.split(',').map((item: string) => item.trim()) : [],
        current_medications: data.current_medications,
        notes: data.notes,
        consent_given: data.consent_given
      };

      if (patient?.id) {
        await api.patients.update(patient.id, patientData);
        toast({
          title: "Success",
          description: "Patient information updated successfully",
        });
      } else {
        const newPatient = await api.patients.create(patientData);
        toast({
          title: "Success",
          description: "Patient created successfully",
        });
        navigate(`/patients/${newPatient.id}`);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "Error",
        description: "Failed to save patient information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="space-y-6">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="personal" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact Info</TabsTrigger>
                    <TabsTrigger value="medical">Medical Info</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>
                  <TabsContent value="personal">
                    <PatientPersonalInfoForm />
                  </TabsContent>
                  <TabsContent value="contact">
                    <PatientContactInfoForm />
                  </TabsContent>
                  <TabsContent value="medical">
                    <PatientMedicalInfoForm />
                  </TabsContent>
                  <TabsContent value="documents">
                    <PatientDocumentsForm />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-end">
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
      </div>
    </div>
  );
}

export { PatientOnboardingForm as PatientForm };