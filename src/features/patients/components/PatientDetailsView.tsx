// src/features/patients/components/PatientDetailsView.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, User, HeartPulse, AlertTriangle, Droplet, Image as ImageIcon, CheckSquare, Paperclip } from 'lucide-react';

// Define the structure of a document object within the patient data
interface PatientDocument {
  path: string;
  url: string;
  name: string;
  type: string; // e.g., 'profile_photo', 'signature', 'id_document', 'medical_record'
  size?: number;
  uploaded_at: string;
}

interface PatientDetailsViewProps {
  patient: any; // Consider defining a more specific Patient type later. Should include the 'documents' array.
  onEdit: () => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined | null }) => (
  value ? (
    <div className="flex items-start py-2">
      <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base">{value}</p>
      </div>
    </div>
  ) : null
);

export function PatientDetailsView({ patient, onEdit }: PatientDetailsViewProps) {
  // DEBUG LOG: Inspect the patient object received by the view
  console.log('Patient object received in PatientDetailsView:', patient);

  if (!patient) return null;

  // Extract documents - ensure it's an array
  const documents: PatientDocument[] = Array.isArray(patient.documents) ? patient.documents : [];

  // Find profile photo specifically
  const profilePhotoDoc = documents.find(doc => doc.type === 'profile_photo');

  // Filter out profile photo for the general list
  const otherDocuments = documents.filter(doc => doc.type !== 'profile_photo');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={User} label="Full Name" value={`${patient.first_name || ''} ${patient.last_name || ''}`} />
          <DetailItem icon={User} label="Gender" value={patient.gender} />
          <DetailItem icon={User} label="Age" value={patient.age} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={Phone} label="Phone" value={patient.phone} />
          <DetailItem icon={Mail} label="Email" value={patient.email} />
          <DetailItem icon={MapPin} label="Address" value={`${patient.address || ''}, ${patient.city || ''}, ${patient.state || ''} ${patient.postal_code || ''}`} />
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <DetailItem icon={User} label="Name" value={patient.emergency_contact_name} />
           <DetailItem icon={Phone} label="Phone" value={patient.emergency_contact_phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={Droplet} label="Blood Group" value={patient.blood_group} />
          <DetailItem icon={AlertTriangle} label="Allergies" value={patient.allergies} />
          <DetailItem icon={HeartPulse} label="Medical Conditions" value={patient.medical_conditions} />
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Profile Photo Separately */}
          {profilePhotoDoc && (
            <div className="flex items-start py-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Photo</p>
                <img src={profilePhotoDoc.url} alt="Profile" className="mt-1 max-w-xs max-h-40 rounded border" />
              </div>
            </div>
          )}

          {/* Display Other Documents from the array */}
          {otherDocuments.length > 0 && (
            <div className="space-y-3 pt-2">
               <p className="text-sm font-medium text-muted-foreground">Other Documents</p>
               {otherDocuments.map((doc) => (
                 <div key={doc.path} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                   <div className="flex items-center space-x-2">
                     <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                     <span className="text-sm truncate" title={doc.name}>{doc.name}</span>
                     <span className="text-xs text-muted-foreground">({doc.type})</span>
                   </div>
                   <a
                     href={doc.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-sm text-blue-600 hover:underline ml-4"
                   >
                     View
                   </a>
                 </div>
               ))}
            </div>
          )}

          {/* Consent */}
          <div className="flex items-start py-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Consent Given</p>
                <p className="text-base">{patient.consent_given ? 'Yes' : 'No'}</p>
                {patient.consent_notes && (
                   <p className="text-sm text-muted-foreground mt-1">Notes: {patient.consent_notes}</p>
                )}
              </div>
            </div>

          {/* Show message if no documents */}
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onEdit}>Edit Profile</Button>
      </div>
    </div>
  );
}
