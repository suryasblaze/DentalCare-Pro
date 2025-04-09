import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MedicalRecordsHistory } from '@/features/patients/components/MedicalRecordsHistory';
import { AddMedicalRecordForm } from '@/features/patients/components/AddMedicalRecordForm'; // Import the form
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Import Dialog components
import { Button } from '@/components/ui/button'; // Import Button if needed for DialogTrigger
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useToast } from "@/components/ui/use-toast"; // Import useToast

// Define types (consider moving to shared types file)
interface Patient {
  id: string;
  full_name: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string | null;
  record_date: string;
  record_type: string;
  description: string;
  attachments?: any | null;
  created_at?: string | null;
  created_by?: string | null;
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

export function PatientMedicalRecordsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [errorRecords, setErrorRecords] = useState<string | null>(null);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false); // Add loading state for submission
  const { toast } = useToast();

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      setErrorPatients(null);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true });

        if (error) throw error;
        setPatients(data.map(p => ({ id: p.id, full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() })) || []);
      } catch (err: any) {
        setErrorPatients('Failed to fetch patients.');
        console.error("Error fetching patients:", err);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // Fetch medical records when a patient is selected
  const fetchMedicalRecords = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setIsLoadingRecords(true);
    setErrorRecords(null);
    setMedicalRecords([]); // Clear previous records
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          staff:created_by ( first_name, last_name )
        `)
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      setMedicalRecords(data || []);
    } catch (err: any) {
      setErrorRecords('Failed to fetch medical records.');
      console.error("Error fetching medical records:", err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchMedicalRecords(selectedPatientId);
    } else {
      setMedicalRecords([]); // Clear records if no patient is selected
    }
  }, [selectedPatientId, fetchMedicalRecords]);

  const handlePatientSelect = (value: string) => {
    setSelectedPatientId(value);
  };

  // Handler for the "Add Record" button within MedicalRecordsHistory
  const handleAddMedicalRecordClick = () => {
    if (!selectedPatientId) {
        toast({
            title: "No Patient Selected",
            description: "Please select a patient before adding a record.",
            variant: "destructive",
        });
        return;
    }
    // Correctly placed: Set modal open only if patient is selected
    setIsAddRecordModalOpen(true);
  }; // Correct end of handleAddMedicalRecordClick

  // Handler for form submission from AddMedicalRecordForm
  const handleFormSubmit = async (values: any) => { // Use 'any' for now, refine later if needed
    if (!selectedPatientId) return;

    setIsSubmittingRecord(true);
    let descriptionData: any = { general_notes: values.general_notes };

    // Structure description based on record type
    switch (values.record_type) {
      case 'consultation':
        descriptionData = {
          ...descriptionData,
          subjective: values.consultation_subjective,
          objective: values.consultation_objective,
          assessment: values.consultation_assessment,
          plan: values.consultation_plan,
        };
        break;
      case 'diagnosis':
        descriptionData = {
          ...descriptionData,
          code: values.diagnosis_code,
          description: values.diagnosis_description,
        };
        break;
      case 'treatment':
        descriptionData = {
          ...descriptionData,
          procedure: values.treatment_procedure,
          details: values.treatment_details,
        };
        break;
      case 'prescription':
         descriptionData = {
          ...descriptionData,
          medication: values.prescription_medication,
          dosage: values.prescription_dosage,
          frequency: values.prescription_frequency,
          duration: values.prescription_duration,
        };
        break;
      case 'lab_result':
         descriptionData = {
          ...descriptionData,
          test_name: values.lab_test_name,
          result_value: values.lab_result_value,
          units: values.lab_units,
          reference_range: values.lab_reference_range,
        };
        break;
       case 'other':
         descriptionData = {
          ...descriptionData,
          details: values.other_details,
        };
        break;
    }

    try {
      const { error } = await supabase
        .from('medical_records')
        .insert({
          patient_id: selectedPatientId,
          record_date: values.record_date,
          record_type: values.record_type,
          description: JSON.stringify(descriptionData), // Store structured data as JSON string
          // created_by: // TODO: Get current user ID if needed
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medical record added successfully.",
      });
      setIsAddRecordModalOpen(false);
      fetchMedicalRecords(selectedPatientId); // Refresh records
    } catch (err: any) {
      console.error("Error saving medical record:", err);
      toast({
        title: "Error",
        description: "Failed to save medical record. " + err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRecord(false);
    }
  };


  return (
    <div>
      <PageHeader heading="Patient Medical Records" text="Select a patient to view or add medical records." />

      <div className="mt-6 mb-8 max-w-md"> {/* Added margin-bottom */}
        <Label htmlFor="patient-select">Select Patient</Label>
        <Select
          value={selectedPatientId ?? ''}
          onValueChange={handlePatientSelect}
          disabled={isLoadingPatients}
        >
          <SelectTrigger id="patient-select" className="w-full">
            <SelectValue placeholder={isLoadingPatients ? "Loading patients..." : "Select a patient"} />
          </SelectTrigger>
          <SelectContent>
            {errorPatients && <SelectItem value="error" disabled>{errorPatients}</SelectItem>}
            {!isLoadingPatients && !errorPatients && patients.length === 0 && (
              <SelectItem value="no-patients" disabled>No patients found</SelectItem>
            )}
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Display loading/error state for records or the history component */}
      {selectedPatientId && (
        isLoadingRecords ? (
          <p>Loading medical records...</p>
        ) : errorRecords ? (
          <p className="text-destructive">{errorRecords}</p>
        ) : (
          <MedicalRecordsHistory
            medicalRecords={medicalRecords}
            onAddMedicalRecord={handleAddMedicalRecordClick} // Pass the handler to open the modal
          />
        )
      )}
      {!selectedPatientId && !isLoadingPatients && (
         <p className="text-muted-foreground mt-8">Please select a patient to view their medical records.</p>
      )}


      {/* Add Medical Record Modal */}
      <Dialog open={isAddRecordModalOpen} onOpenChange={setIsAddRecordModalOpen}>
        {/* DialogTrigger is not strictly needed if opened programmatically */}
        <DialogContent className="sm:max-w-[600px]"> {/* Adjust width as needed */}
          <DialogHeader>
            <DialogTitle>Add New Medical Record</DialogTitle>
          </DialogHeader>
          {selectedPatientId && (
            <AddMedicalRecordForm
              patientId={selectedPatientId}
              onSubmit={handleFormSubmit} // Use onSubmit
              onCancel={() => setIsAddRecordModalOpen(false)}
              isLoading={isSubmittingRecord} // Pass loading state
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
