import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Search, Plus, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { PatientForm } from '@/features/patients/components/PatientForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { globalCache } from '@/lib/utils/cache-manager';
// Import PatientDetailsView and its required prop types (PatientDentalHistoryTooth)
import { PatientDetailsView, PatientDentalHistoryTooth } from '@/features/patients/components/PatientDetailsView';
import { AddMedicalRecordForm } from '@/features/patients/components/AddMedicalRecordForm';
import { Appointment } from '@/types';

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  onSuccess: (patientId?: string) => void;
}

function PatientFormDialog({ open, onOpenChange, patient, onSuccess }: PatientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Add max-height and vertical scroll */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"> 
        <DialogHeader>
          <DialogTitle>{patient ? 'Edit Patient' : 'New Patient'}</DialogTitle>
        </DialogHeader>
        <PatientForm 
          patient={patient} 
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function Patients() {
  const { id } = useParams();
  return id ? <PatientDetails /> : <PatientList />;
}

export function PatientList() {
  const navigate = useNavigate();


  const { toast } = useToast();  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await api.patients.getAll();
      // Calculate and add profile completion for each patient
      const patientsWithCompletion = data.map(patient => ({
        ...patient,
        profileCompletion: calculateProfileCompletion(patient)
      }));
      setPatients(patientsWithCompletion);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setLoading(false);
    }
  };

  const calculateProfileCompletion = (patient: any) => {
    if (!patient) return 0;
    
    // Define fields that contribute to completion percentage
    const fields = [
      'first_name', 'last_name', 'gender', 'age', 'phone', 'email', 
      'address', 'city', 'state', 'postal_code', 'emergency_contact_name', 
      'emergency_contact_phone', 'blood_group', 'allergies', 'medical_conditions'
    ];
    
    let completedFields = 0;
    fields.forEach(field => {
      if (patient[field] !== null && patient[field] !== undefined && patient[field] !== '') {
        completedFields++;
      }
    });
    
    return Math.floor((completedFields / fields.length) * 100);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await api.patients.search(query);
        const resultsWithCompletion = results.map(patient => ({
          ...patient,
          profileCompletion: calculateProfileCompletion(patient)
        }));
        setPatients(resultsWithCompletion);
      } catch (error) {
        console.error('Error searching patients:', error);
      }
    } else if (query.length === 0) {
      fetchPatients();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient information and appointments
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or registration number..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        
        <Button onClick={() => setShowNewPatientDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </div>
      
      {showNewPatientDialog && (
        <PatientFormDialog
          open={showNewPatientDialog}
          onOpenChange={setShowNewPatientDialog}
          onSuccess={(patientId) => {
            setShowNewPatientDialog(false);
            navigate(`/patients/${patientId}`);
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-8">Loading patients...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <Card key={patient.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{patient.first_name} {patient.last_name}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      patient.profileCompletion === 100 ? 'bg-green-100 text-green-800' :
                      patient.profileCompletion > 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {patient.profileCompletion === 100 ? 'Complete' :
                       patient.profileCompletion > 50 ? 'In Progress' : 'Basic'}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {patient.phone}
                  </div>
                  
                  {patient.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {patient.email}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Profile Completion</span>
                      <span>{patient.profileCompletion}%</span>
                    </div>
                    <Progress value={patient.profileCompletion} />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/patients/${patient.id}`, { state: { action: 'view' } })}
                >
                  View Details
                </Button>
                
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate(`/patients/${patient.id}`, { state: { action: 'edit' } })}
                >
                  <User className="h-4 w-4 mr-1" />
                  {patient.profileCompletion < 100 ? 'Complete Profile' : 'Edit Profile'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

}
export function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Ensure id is typed
  const { state } = useLocation();
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [dentalHistoryTeeth, setDentalHistoryTeeth] = useState<PatientDentalHistoryTooth[]>([]); // <<< State for dental history teeth
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(state?.action === 'edit');
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false); // State for Add Record dialog
  const [addRecordLoading, setAddRecordLoading] = useState(false); // Loading state for Add Record form
  const { toast } = useToast(); // Get toast function

  // <<< Log component render and isEditing state >>>
  console.log(`Patients.tsx: PatientDetails rendering. isEditing: ${isEditing}, Patient ID: ${id}`);

  useEffect(() => {
    if (id) {
      fetchPatientAndAppointments(id);
    }
  }, [id]);

  const fetchPatientAndAppointments = async (patientId: string) => {
    setLoading(true);
    try {
      // Invalidate cache for this specific patient before fetching
      globalCache.invalidate(`patients:${patientId}`);
      globalCache.invalidate(`appointments:patient:${patientId}`);
      globalCache.invalidate(`medical_records:${patientId}`);
      globalCache.invalidate(`patient_dental_history_teeth:${patientId}`); // <<< Invalidate dental history teeth cache

      // Fetch patient, appointments, medical records, and dental history teeth concurrently
      const [patientData, appointmentsData, medicalRecordsData, dentalHistoryTeethData] = await Promise.all([
        api.patients.getById(patientId),
        api.appointments.getByPatientId(patientId),
        api.patients.getMedicalRecords(patientId),
        api.patients.getPatientDentalHistoryTeeth(patientId) // <<< Fetch dental history teeth
      ]);

      setPatient(patientData);
      setAppointments(appointmentsData || []);
      setMedicalRecords(medicalRecordsData || []);
      setDentalHistoryTeeth(dentalHistoryTeethData || []); // <<< Set dental history teeth state

    } catch (error) {
      console.error('Error fetching patient details:', error);
      // Optionally set an error state here
    } finally {
      setLoading(false);
    }
  };

  // Handler to open the Add Medical Record dialog
  const handleAddMedicalRecord = () => {
    setShowAddRecordDialog(true);
  };

  // Handler to save a new medical record
  const handleSaveMedicalRecord = async (formValues: any) => { // Renamed values to formValues
    if (!id) return; 
    setAddRecordLoading(true);
    
    // Structure the details based on record type
    let recordDetails: any = {
      general_notes: formValues.general_notes || undefined, // Include general notes if present
    };

    switch (formValues.record_type) {
      case 'consultation':
        recordDetails = {
          ...recordDetails,
          subjective: formValues.consultation_subjective || undefined,
          objective: formValues.consultation_objective || undefined,
          assessment: formValues.consultation_assessment || undefined,
          plan: formValues.consultation_plan || undefined,
        };
        break;
      case 'diagnosis':
        recordDetails = {
          ...recordDetails,
          code: formValues.diagnosis_code || undefined,
          description: formValues.diagnosis_description || undefined,
        };
        break;
      case 'treatment':
         recordDetails = {
          ...recordDetails,
          procedure: formValues.treatment_procedure || undefined,
          details: formValues.treatment_details || undefined,
        };
        break;
      case 'prescription':
         recordDetails = {
          ...recordDetails,
          medication: formValues.prescription_medication || undefined,
          dosage: formValues.prescription_dosage || undefined,
          frequency: formValues.prescription_frequency || undefined,
          duration: formValues.prescription_duration || undefined,
        };
        break;
      case 'lab_result':
         recordDetails = {
          ...recordDetails,
          test_name: formValues.lab_test_name || undefined,
          result_value: formValues.lab_result_value || undefined,
          units: formValues.lab_units || undefined,
          reference_range: formValues.lab_reference_range || undefined,
        };
        break;
       case 'other':
         recordDetails = {
          ...recordDetails,
          details: formValues.other_details || undefined,
        };
        break;
    }

    // Remove undefined keys to keep the JSON clean
    Object.keys(recordDetails).forEach(key => recordDetails[key] === undefined && delete recordDetails[key]);

    try {
      await api.patients.createMedicalRecord({
        patient_id: id,
        record_date: formValues.record_date, // Use the date from the form
        record_type: formValues.record_type, // Use the type from the form
        description: JSON.stringify(recordDetails), // Store structured details as JSON string
        // created_by: 'current_user_id' // TODO: Get current user ID if needed
      }, []); // <<< Pass empty array for toothIds as the AddMedicalRecordForm doesn't handle teeth
      toast({
        title: "Success",
        description: "Medical record added successfully.",
      });
      setShowAddRecordDialog(false);
      fetchPatientAndAppointments(id); // Refresh the list
    } catch (error) {
      console.error("Error adding medical record:", error);
      toast({
        title: "Error",
        description: "Failed to add medical record.",
        variant: "destructive",
      });
    } finally {
      setAddRecordLoading(false);
    }
  };


  // Handler for booking a new appointment
  const handleBookAppointment = (patientId: string) => {
    // Navigate to the appointments page, potentially passing patientId
    // Adjust the route as needed based on your appointment booking flow
    navigate(`/appointments?patientId=${patientId}&action=new`);
    // Or trigger a modal, etc.
  };


  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading patient details...</div>;
  }
  
  if (!patient) {
    return <div className="flex items-center justify-center h-full">Patient not found</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? 'Edit Patient Profile' : 'Patient Details'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.first_name} {patient.last_name}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/patients')}>
            Back to List
          </Button>
          <Button onClick={() => {
              console.log(`Patients.tsx: Edit/View button clicked. Current isEditing: ${isEditing}`); // <<< Log before state change
              setIsEditing(!isEditing);
              // Note: State updates might be asynchronous, this log might show the old value immediately after the call.
              // The re-render log below is more reliable for the updated state.
              console.log(`Patients.tsx: setIsEditing called.`); 
            }}>
            {isEditing ? 'View Details' : 'Edit Profile'}
          </Button>
        </div>
      </div>
      
      {isEditing ? (
        <>
          {/* <<< Add logging here >>> */}
          {console.log(`Patients.tsx: Rendering PatientForm for editing. Key: ${patient?.id || 'new-patient-form'}, Patient ID: ${patient?.id}`)}
          <PatientForm
            key={patient?.id || 'new-patient-form'} // <<< Add key prop here
            patient={patient}
            onSuccess={() => {
              fetchPatientAndAppointments(id!); // Refetch both on success
            setIsEditing(false);
          }}
            onCancel={() => setIsEditing(false)}
          />
        </>
      ) : (
        <PatientDetailsView
          patient={patient}
          appointments={appointments}
          medicalRecords={medicalRecords}
          dentalHistoryTeeth={dentalHistoryTeeth} // <<< Pass dental history teeth
          onEdit={() => setIsEditing(true)}
          onBookAppointment={handleBookAppointment}
          onAddMedicalRecord={handleAddMedicalRecord} // Pass Add Record handler
        />
      )}

      {/* Add Medical Record Dialog */}
      <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Medical Record</DialogTitle>
          </DialogHeader>
          <AddMedicalRecordForm
            patientId={id!} // Pass patient ID
            onSubmit={handleSaveMedicalRecord}
            onCancel={() => setShowAddRecordDialog(false)}
            isLoading={addRecordLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
