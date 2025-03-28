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

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  onSuccess: (patientId?: string) => void;
}

function PatientFormDialog({ open, onOpenChange, patient, onSuccess }: PatientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
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
  const { id } = useParams();
  const { toast } = useToast();
  const [patients, setPatients] = useState<any[]>([]);
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
  const { id } = useParams();
  const { state } = useLocation();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(state?.action === 'edit');
  
  useEffect(() => {
    if (id) {
      fetchPatient(id);
    }
  }, [id]);
  
  const fetchPatient = async (patientId: string) => {
    try {
      const data = await api.patients.getById(patientId);
      setPatient(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patient:', error);
      setLoading(false);
    }
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
          <Button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'View Details' : 'Edit Profile'}
          </Button>
        </div>
      </div>
      
      {isEditing ? (
        <PatientForm
          patient={patient}
          onSuccess={() => {
            fetchPatient(id!);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <PatientDetailsView patient={patient} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
}