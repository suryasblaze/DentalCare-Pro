import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
// Remove Select imports if no longer needed, keep Label
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input'; // Import Input
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for results
import { MedicalRecordsHistory } from '@/features/patients/components/MedicalRecordsHistory';
import { DentalRecordForm } from '@/features/patients/components/DentalRecordForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Import Dialog components
import { Button } from '@/components/ui/button'; // Import Button
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useToast } from "@/components/ui/use-toast"; // Import useToast
import { api } from '@/lib/api'; // Import the api object
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle } from 'lucide-react';

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

  // Handler for form submission from DentalRecordForm
  const handleFormSubmit = async (values: any) => {
    if (!selectedPatientId) return;
    setIsSubmittingRecord(true);

    try {
      // Convert attachments to array format
      const attachments = [
        ...(Array.isArray(values.xray_images) ? values.xray_images : []).map((img: any, idx: number) => ({
          type: 'xray',
          name: img.name || `X-ray Image ${idx + 1}`,
          ...img
        })),
        ...(Array.isArray(values.clinical_photos) ? values.clinical_photos : []).map((photo: any, idx: number) => ({
          type: 'photo',
          name: photo.name || `Clinical Photo ${idx + 1}`,
          ...photo
        })),
        ...(Array.isArray(values.documents) ? values.documents : []).map((doc: any, idx: number) => ({
          type: 'document',
          name: doc.name || `Document ${idx + 1}`,
          ...doc
        }))
      ];

      // Transform flat form values into nested structure for UI compatibility
      const nestedDescription = {
        chief_complaint: values.chief_complaint,
        vital_signs: {
          blood_pressure: values.blood_pressure,
          pulse_rate: values.pulse_rate,
        },
        examination: {
          extra_oral: values.extra_oral_exam,
          intra_oral: values.intra_oral_exam,
        },
        diagnosis: {
          notes: values.diagnosis_notes,
          codes: values.diagnosis_codes,
        },
        treatment: {
          phase: values.treatment_phase,
          procedures: values.treatment_procedures,
        },
        prescriptions: values.prescriptions,
        instructions: {
          home_care: values.home_care_instructions,
          follow_up: values.follow_up_date,
        },
        lab_results: values.lab_results,
        custom_notes: values.custom_notes,
        doctor: values.doctor,
        xray_images: values.xray_images,
        clinical_photos: values.clinical_photos,
        documents: values.documents,
        record_date: values.record_date,
      };

      const recordData = {
        patient_id: selectedPatientId,
        record_date: new Date().toISOString(),
        record_type: 'examination',
        description: JSON.stringify(nestedDescription), // Save in nested format
        attachments: attachments
      };

      await api.patients.createMedicalRecord(recordData, []);
      
      console.log('Dental record saved:', recordData); // Confirmation log
      
      toast({
        title: "Success",
        description: "Dental record added successfully.",
      });
      setIsAddRecordModalOpen(false);
      fetchMedicalRecords(selectedPatientId);
    } catch (err: any) {
      console.error("Error saving dental record:", err);
      toast({
        title: "Error",
        description: "Failed to save dental record. " + err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  return (
    <div className="w-full min-h-screen h-screen flex flex-col md:flex-row gap-8 px-4 py-8 bg-gray-50">
      {/* Patient List Column */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-8 flex flex-col min-h-[600px]">
        <Label htmlFor="patient-search" className="mb-2">Search Patients</Label>
        <Input
          id="patient-search"
          type="search"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <TooltipProvider>
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoadingPatients ? (
              <div className="space-y-3 mt-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : errorPatients ? (
              <p className="text-destructive">{errorPatients}</p>
            ) : (
              <div className="grid gap-3">
                {patients.filter(patient => {
                  const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                  const phone = patient.phone?.toLowerCase() || '';
                  const regNum = patient.registration_number?.toLowerCase() || '';
                  const searchLower = searchTerm.toLowerCase();
                  return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                }).length > 0 ? (
                  patients
                    .filter(patient => {
                      const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                      const phone = patient.phone?.toLowerCase() || '';
                      const regNum = patient.registration_number?.toLowerCase() || '';
                      const searchLower = searchTerm.toLowerCase();
                      return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                    })
                    .map((patient) => {
                      const isSelected = selectedPatientId === patient.id;
                      const initials = `${(patient.first_name?.[0] || '').toUpperCase()}${(patient.last_name?.[0] || '').toUpperCase()}`;
                      return (
                        <Card
                          key={patient.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer border transition-shadow ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-lg' : 'hover:shadow-md'} group`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>{initials || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold truncate">{`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unnamed'}</span>
                              {patient.registration_number && (
                                <Badge variant="secondary" className="ml-1">Reg: {patient.registration_number}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {patient.phone && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground underline cursor-help">{patient.phone}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>Phone: {patient.phone}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                ) : (
                  <p className="text-sm text-muted-foreground p-2">No patients found matching "{searchTerm}"</p>
                )}
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>
      {/* Medical Records History Column */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-8 min-h-[600px] flex flex-col justify-start">
        <PageHeader
          heading="Patient Medical Records"
          text="View and manage patient medical records"
          className="mb-6"
        />
        {selectedPatientId ? (
          <MedicalRecordsHistory
            medicalRecords={medicalRecords}
            onAddMedicalRecord={handleAddMedicalRecordClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in py-24">
            <UserCircle className="w-20 h-20 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Select a patient to view their medical records</h2>
            <p className="text-muted-foreground mb-4">Search or scroll the patient list and click a patient to get started.</p>
          </div>
        )}
      </div>
      {/* Dental Record Form Dialog - adjust max width for better sizing */}
      <Dialog 
        open={isAddRecordModalOpen} 
        onOpenChange={setIsAddRecordModalOpen}
      >
        <DialogContent className="max-w-5xl w-full mx-auto rounded-lg shadow-lg">
          {selectedPatientId && selectedPatientName && (
            <DentalRecordForm
              patientId={selectedPatientId}
              patientName={selectedPatientName}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsAddRecordModalOpen(false)}
              isLoading={isSubmittingRecord}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
