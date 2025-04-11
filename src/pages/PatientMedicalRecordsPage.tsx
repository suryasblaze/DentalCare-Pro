import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
// Remove Select imports if no longer needed, keep Label
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input'; // Import Input
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for results
import { MedicalRecordsHistory } from '@/features/patients/components/MedicalRecordsHistory';
import { AddMedicalRecordForm } from '@/features/patients/components/AddMedicalRecordForm'; // Import the form
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Import Dialog components
import { Button } from '@/components/ui/button'; // Import Button
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useToast } from "@/components/ui/use-toast"; // Import useToast
import { api } from '@/lib/api'; // Import the api object

// Define types (consider moving to shared types file)
interface Patient {
  id: string;
  first_name: string | null; // Allow null
  last_name: string | null; // Allow null
  phone: string | null; // Corrected column name
  registration_number: string | null; // Add registration_number
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
  // Add teeth array to the interface
  teeth?: { id: number; description: string }[]; 
}

export function PatientMedicalRecordsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // Add state for search term
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null); // State to show selected patient name
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
        // Fetch required fields for searching using correct column names
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, phone, registration_number') // Corrected 'phone'
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true });

        if (error) throw error;
        // Map data directly to the Patient interface
        setPatients(data || []);
      } catch (err: any) {
        setErrorPatients('Failed to fetch patients.'); // Keep error message generic for user
        console.error("Error fetching patients:", err); // Log specific error for debugging
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

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    setSearchTerm(''); // Clear search term after selection
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
  // Update signature to accept values and toothIds
  const handleFormSubmit = async (values: any, toothIds: number[]) => { 
    if (!selectedPatientId) return;

    setIsSubmittingRecord(true);

    // Mapping is now done in api.ts, remove it from here

    let descriptionData: any = { general_notes: values.general_notes };

    // Structure description based on record type (using original frontend type for logic)
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

    // Prepare the main record data (pass the original form record_type to api.ts)
    const recordData = {
      patient_id: selectedPatientId,
      record_date: values.record_date,
      record_type: values.record_type, // Pass the original form value
      description: JSON.stringify(descriptionData), // Store structured data as JSON string
      // created_by: // TODO: Get current user ID if needed
    };

    // Logging is now done in api.ts

    try {
      // Call the API layer function
      // Pass both recordData and toothIds
      await api.patients.createMedicalRecord(recordData, toothIds);

      // No need to check error here if api function throws on error

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

      <div className="mt-6 mb-8 max-w-md relative"> {/* Added relative positioning */}
        <Label htmlFor="patient-search">Select Patient</Label>
        <Input
          type="search"
          id="patient-search"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedPatientId(null); // Clear selection when searching
            setSelectedPatientName(null);
          }}
          placeholder={selectedPatientName || "Search by name, phone, or registration..."} // Show selected name or placeholder
          disabled={isLoadingPatients}
          className="w-full"
        />
        {isLoadingPatients && <p className="text-sm text-muted-foreground mt-1">Loading patients...</p>}
        {errorPatients && <p className="text-sm text-destructive mt-1">{errorPatients}</p>}

        {/* Search Results Dropdown */}
        {searchTerm && !isLoadingPatients && !errorPatients && (
          <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60"> {/* Dropdown styling */}
            <div className="p-2">
              {patients.filter(patient => {
                const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                const phone = patient.phone?.toLowerCase() || ''; // Corrected 'phone'
                const regNum = patient.registration_number?.toLowerCase() || '';
                const searchLower = searchTerm.toLowerCase();
                return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
              }).length > 0 ? (
                patients
                  .filter(patient => {
                    const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                    const phone = patient.phone?.toLowerCase() || ''; // Corrected 'phone'
                    const regNum = patient.registration_number?.toLowerCase() || '';
                    const searchLower = searchTerm.toLowerCase();
                    return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                  })
                  .map((patient) => (
                    <Button
                      key={patient.id}
                      variant="ghost" // Use ghost variant for list items
                      className="w-full justify-start text-left h-auto py-2 px-3 mb-1" // Adjust padding/margin
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <div>
                        <div>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</div>
                        <div className="text-xs text-muted-foreground">
                          {patient.registration_number && `Reg: ${patient.registration_number}`}
                          {patient.registration_number && patient.phone && " | "}
                          {patient.phone && `Ph: ${patient.phone}`} {/* Corrected 'phone' */}
                        </div>
                      </div>
                    </Button>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground p-2">No patients found matching "{searchTerm}"</p>
              )}
            </div>
          </ScrollArea>
        )}
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
      {/* Keep message if no patient is selected *after* loading */}
      {!selectedPatientId && !isLoadingPatients && !searchTerm && (
         <p className="text-muted-foreground mt-8">Please search for and select a patient to view their medical records.</p>
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
