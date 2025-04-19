import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
// Remove Select imports if no longer needed, keep Label
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input'; // Import Input
 import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for results
 import { MedicalRecordsHistory } from '@/features/patients/components/MedicalRecordsHistory';
 import { AddMedicalRecordForm, type MedicalRecordFormSchemaValues } from '@/features/patients/components/AddMedicalRecordForm'; // Import the form AND the type
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
       // Add explicit check again inside try, although the top guard should suffice
       if (!patientId) { 
         throw new Error("Patient ID became null unexpectedly.");
       }
       const { data, error } = await supabase
         .from('medical_records')
         .select(`
           *,
           staff:created_by ( first_name, last_name ),
           teeth:medical_record_teeth ( teeth ( id, description ) ) 
         `) // Fetch teeth via junction table
         .eq('patient_id', patientId)
         .order('record_date', { ascending: false });
 
       if (error) throw error;
 
       // Process the data to flatten the teeth structure
       const processedData = (data || []).map(record => {
         // The 'teeth' property from the query is actually the junction table result array
         const junctionTeeth = record.teeth || []; 
         // Map the junction array to extract the actual tooth object
         const flattenedTeeth = junctionTeeth.map((junctionEntry: any) => junctionEntry.teeth).filter(Boolean); // Filter out null/undefined if any
         
         return {
           ...record,
           teeth: flattenedTeeth // Assign the flattened array
         };
       });
 
       setMedicalRecords(processedData);
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
   // Explicitly type 'values' and ensure return type matches Promise<void>
   const handleFormSubmit = async (values: MedicalRecordFormSchemaValues, toothIds: number[]): Promise<void> => { 
     if (!selectedPatientId) return;
 
    setIsSubmittingRecord(true);

    // Mapping is now done in api.ts, remove it from here

     // Initialize descriptionData, always include general_notes if it exists
     let descriptionData: any = {};
     if (values.general_notes && String(values.general_notes).trim() !== '') {
        descriptionData.general_notes = values.general_notes;
     }
 
     // Structure description based on the actual DB record_type value from the form
     switch (values.record_type) {
       case 'examination': // Handles Consultation/Examination/Diagnosis
         // Add SOAP fields if they exist
         if (values.consultation_subjective) descriptionData.subjective = values.consultation_subjective;
         if (values.consultation_objective) descriptionData.objective = values.consultation_objective;
         if (values.consultation_assessment) descriptionData.assessment = values.consultation_assessment;
         if (values.consultation_plan) descriptionData.plan = values.consultation_plan;
         // Add Diagnosis fields if they exist
         if (values.diagnosis_code) descriptionData.code = values.diagnosis_code;
         if (values.diagnosis_description) descriptionData.description = values.diagnosis_description;
         break;
       // case 'diagnosis': // Combined into 'examination'
       //   descriptionData = {
       //     ...descriptionData,
       //     code: values.diagnosis_code,
       //     description: values.diagnosis_description,
       //   };
       //   break;
       case 'procedure': // Handles Treatment/Procedure
         descriptionData = {
           ...descriptionData,
           procedure: values.treatment_procedure,
           details: values.treatment_details, // This is likely the field for treatment notes
         };
         break;
       case 'prescription':
          descriptionData = {
            ...descriptionData,
           // Remove incorrect objective/assessment fields from prescription
           // objective: values.consultation_objective, 
           // assessment: values.consultation_assessment, 
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
        case 'note': // Handles Other Note
          // Use 'other_details' field from the form for the 'details' key in JSON
          if (values.other_details && String(values.other_details).trim() !== '') {
             descriptionData.details = values.other_details;
          }
          // If only general_notes was filled, descriptionData already contains it.
          // If both were filled, both will be included.
           // If neither was filled for 'note', descriptionData might be empty {}
          break;
     } // <-- Add missing closing brace for switch statement
      // Ensure descriptionData is not empty before stringifying, otherwise use null or empty string?
      // Let's store '{}' if nothing was added besides potentially empty general_notes initially.
      const descriptionString = Object.keys(descriptionData).length > 0 ? JSON.stringify(descriptionData) : '{}';
 
     // Combine selected date with current time for a full timestamp
     const recordDateTime = new Date(); // Get current date and time
     const formDate = new Date(values.record_date + 'T00:00:00'); // Parse form date as local midnight
     // Set the date part from the form, keep the current time part
     recordDateTime.setFullYear(formDate.getFullYear());
     recordDateTime.setMonth(formDate.getMonth());
     recordDateTime.setDate(formDate.getDate());
     const recordTimestamp = recordDateTime.toISOString(); // Convert to ISO string (UTC)
 
     // Prepare the main record data
     const recordData = {
       patient_id: selectedPatientId,
       record_date: recordTimestamp, // Use the full timestamp
       record_type: values.record_type, // Use the DB enum value
       description: descriptionString, // Store structured data as JSON string
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
