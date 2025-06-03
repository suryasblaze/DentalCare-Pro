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
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [errorRecords, setErrorRecords] = useState<string | null>(null);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false); // Add loading state for submission
  const [doctors, setDoctors] = useState<any[]>([]); // Add state for doctors
  const { toast } = useToast();
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  const [viewingPatientName, setViewingPatientName] = useState<string | null>(null);

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

  // Fetch doctors
  useEffect(() => {
    api.staff.getDoctors().then(setDoctors).catch(() => setDoctors([]));
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

  const handleViewMedicalRecords = (patient: Patient) => {
    setViewingPatientId(patient.id);
    setViewingPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    setSelectedPatientId(patient.id); // for fetching records
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
  };

  const handleBackToPatients = () => {
    setViewingPatientId(null);
    setViewingPatientName(null);
    setSelectedPatientId(null);
    setSelectedPatientName(null);
    setMedicalRecords([]);
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
        attachments: attachments.length ? attachments : null // Ensure valid JSON or null
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
    <div className="w-full min-h-screen h-screen flex flex-col md:flex-row gap-4 md:gap-8 px-2 md:px-4 py-4 md:py-8 bg-white">
      {/* Split layout: Left (patients), Right (records) */}
      <div className="flex flex-1 flex-col md:flex-row gap-6 w-full h-full">
        {/* Left: Patient Cards, 2 per row vertical grid */}
        <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
          <div className="h-full flex flex-col">
            <div className="w-full mb-3">
              <Input
                id="patient-search"
                type="search"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm md:text-base"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-0 w-full justify-start"
                style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', margin: 0, padding: 0 }}
              >
                {patients.filter(patient => {
                  const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                  const phone = patient.phone?.toLowerCase() || '';
                  const regNum = patient.registration_number?.toLowerCase() || '';
                  const searchLower = searchTerm.toLowerCase();
                  return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                }).map((patient) => {
                  const initials = `${(patient.first_name?.[0] || '').toUpperCase()}${(patient.last_name?.[0] || '').toUpperCase()}`;
                  return (
                    <div
                      key={patient.id}
                      className="relative flex flex-col items-center p-1.5 rounded-lg shadow bg-white/70 border border-blue-200 transition-all duration-200 cursor-pointer group min-w-[110px] max-w-[140px] font-sans"
                      style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)', background: 'rgba(255,255,255,0.90)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.97)';
                        e.currentTarget.style.backdropFilter = 'blur(12px)';
                        e.currentTarget.style.border = '0.5px solid';
                        e.currentTarget.style.borderImage = 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%) 1';
                        e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6, 0 8px 32px 0 rgba(59,130,246,0.10)';
                        e.currentTarget.style.transform = 'scale(1.045)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.90)';
                        e.currentTarget.style.backdropFilter = 'blur(6px)';
                        e.currentTarget.style.border = '0.5px solid #bfdbfe';
                        e.currentTarget.style.borderImage = '';
                        e.currentTarget.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onClick={() => handleViewMedicalRecords(patient)}
                    >
                      <Avatar className="h-9 w-9 mb-1 shadow-sm border border-blue-200 bg-white/70">
                        <AvatarFallback className="text-sm">{initials || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="font-bold text-center text-[15px] mb-0.5 truncate w-full capitalize text-gray-900 drop-shadow-sm">
                        {`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unnamed'}
                      </div>
                      {patient.registration_number && (
                        <div className="text-[11px] text-blue-700 font-semibold mb-0.5">Reg: {patient.registration_number}</div>
                      )}
                      {patient.phone && (
                        <div className="text-[11px] text-muted-foreground mb-1">{patient.phone}</div>
                      )}
                      {/* Glassy gradient overlay */}
                      <div className="pointer-events-none absolute inset-0 rounded-lg" style={{background: 'linear-gradient(120deg,rgba(255,255,255,0.10) 0%,rgba(96,165,250,0.07) 100%)'}} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {/* Right: Medical Records/Details */}
        <div className="flex-1 flex flex-col">
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 border border-dotted border-gray-300 rounded-xl p-4 md:p-8 min-h-[400px]">
            {/* Step 2: Full-Page Medical Records View */}
            {viewingPatientId ? (
              <MedicalRecordsHistory
                medicalRecords={medicalRecords}
                onAddMedicalRecord={handleAddMedicalRecordClick}
                doctors={doctors}
                fullPage // pass a prop if you want to adjust styles for full page
              />
            ) : (
              <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center h-96 text-center animate-fade-in py-12 md:py-24">
                <UserCircle className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground mb-4 md:mb-6" />
                <h2 className="text-xl md:text-2xl font-semibold mb-2">Select a patient to view their medical records</h2>
                <p className="text-muted-foreground mb-4">Scroll and click a patient card to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Dental Record Form Dialog */}
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
