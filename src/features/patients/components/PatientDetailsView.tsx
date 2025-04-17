// src/features/patients/components/PatientDetailsView.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Added Users, Activity, MoveVertical (for Height), Weight, FileText icons
import { Phone, Mail, MapPin, User, Users, HeartPulse, AlertTriangle, Droplet, Image as ImageIcon, CheckSquare, Paperclip, CalendarClock, PlusCircle, Activity, MoveVertical, Weight, FileText } from 'lucide-react';

// Removed local Appointment interface definition

import { Appointment, PatientDocument as SharedPatientDocument } from '@/types'; // Import Appointment type and rename PatientDocument to avoid conflict
import { MedicalRecordsHistory } from './MedicalRecordsHistory'; // Import the new component

// Define Medical Record type based on database.types.ts (or import if defined in @/types)
interface MedicalRecord {
  id: string;
  patient_id: string | null;
  record_date: string;
  record_type: string; // e.g., "consultation", "diagnosis", "treatment", etc.
  description: string; // Can be plain text or JSON string
  attachments?: any | null; // Assuming JSON or similar
  created_at?: string | null;
  created_by?: string | null; // Staff ID
  // Add staff details if fetched
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}


interface PatientDetailsViewProps {
  patient: any; // Consider defining a more specific Patient type later. Should include the 'documents' array.
  appointments?: Appointment[]; // Use imported Appointment type
  medicalRecords?: MedicalRecord[]; // Added medical records prop
  onEdit: () => void;
  onBookAppointment: (patientId: string) => void; // Added booking handler prop
  onAddMedicalRecord: () => void; // Add handler for adding a new medical record
}

// Removed the local type alias for PatientDocument to resolve duplicate identifier error
// type PatientDocument = SharedPatientDocument;

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined | null | React.ReactNode }) => ( // Allow ReactNode for value
  value ? (
    <div className="flex items-start py-2">
      <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="text-base">{value}</p>
        ) : (
          <div className="text-base">{value}</div> // Render ReactNode directly
        )}
      </div>
    </div>
  ) : null
);

// Re-add formatDateTime as it's still used elsewhere in this component
const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  try {
    return new Date(dateTimeString).toLocaleString();
  } catch (e) {
    return dateTimeString; // Fallback if parsing fails
  }
};

// Helper function to generate a summary from family history JSON
const generateFamilyHistorySummary = (history: any): string => {
  if (!history || typeof history !== 'object') return 'No significant family history reported.';

  // Handle object format { conditions?: string[], other?: string }
  const conditions = history?.conditions;
  const other = history?.other;
  let conditionSummary = '';
  let otherSummary = '';

  if (Array.isArray(conditions) && conditions.length > 0) {
    conditionSummary = conditions.map(cond =>
      cond.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    ).join(', ');
  }

  if (other && typeof other === 'string' && other.trim() !== '') {
    // Format "Other: Details"
    otherSummary = `Other: ${other.trim()}`;
  }

  // Combine parts, ensuring correct spacing and handling cases where one part is missing
  if (conditionSummary && otherSummary) {
    return `${conditionSummary}, ${otherSummary}`;
  } else if (conditionSummary) {
    return conditionSummary;
  } else if (otherSummary) {
    // If only 'other' exists, just return that part without the "Other: " prefix if it makes sense,
    // or keep the prefix for clarity. Let's keep the prefix.
    return otherSummary;
  } else {
    return 'No significant family history reported.';
  }
};

// Helper function to generate a summary from lifestyle habits JSON
const generateLifestyleSummary = (habits: any): string => {
  if (!habits || typeof habits !== 'object') return 'No lifestyle habits reported.';

  // Iterate through all keys in the habits object
  const summaryParts: string[] = [];
  Object.entries(habits).forEach(([key, value]) => {
    // Simplified check: If the value is a string and not empty after trimming, display it.
    if (value && typeof value === 'string' && value.trim() !== '') {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        summaryParts.push(`${formattedKey}: ${value.trim()}`);
    }
  });

  const result = summaryParts.length > 0 ? summaryParts.join('; ') : 'No lifestyle habits reported.';
  console.log('generateLifestyleSummary result:', result, 'Input habits:', habits); // Log the result and input
  return result;
};

// Helper function to generate a summary from detailed medical info JSON
const generateDetailedMedicalInfoSummary = (info: any): string => {
  if (!info || typeof info !== 'object') return 'No specific details reported.'; // Return default message if no info
  const parts: string[] = [];

  // Handle 'yes'/'no' fields - only add if 'yes' and include details if present
  if (info.has_implants === 'yes') parts.push(`Implants: Yes${info.implants_details ? ` (${info.implants_details})` : ''}`);
  if (info.recent_health_changes === 'yes') parts.push(`Recent Health Changes: Yes${info.health_changes_details ? ` (${info.health_changes_details})` : ''}`);
  if (info.recent_medical_screenings === 'yes') parts.push(`Screenings: Yes${info.screenings_details ? ` (${info.screenings_details})` : ''}`);
  if (info.dental_material_allergies === 'yes') parts.push(`Dental Material Allergies: Yes${info.dental_material_allergies_details ? ` (${info.dental_material_allergies_details})` : ''}`);

  // Handle immunizations status if not 'not_sure'
  if (info.immunizations_up_to_date && info.immunizations_up_to_date !== 'not_sure') {
    parts.push(`Immunizations Up To Date: ${info.immunizations_up_to_date}`);
  }
  // Always add recent immunizations if present and not empty
  if (info.recent_immunizations && info.recent_immunizations.trim() !== '') {
    parts.push(`Recent Immunizations: ${info.recent_immunizations}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'No specific details reported.';
};

// Helper function to generate a summary from dental history JSON
const generateDentalHistorySummary = (history: any): string => {
  if (!history || typeof history !== 'object') return 'N/A';
  const parts: string[] = [];
  if (history.chief_complaint) parts.push(`Complaint: ${history.chief_complaint}`);
  if (history.has_pain === 'yes' || history.has_pain === true) parts.push(`Pain: Yes (Scale: ${history.pain_scale || 'N/A'}, Desc: ${history.pain_description || 'N/A'})`);
  if (history.brushing_frequency) parts.push(`Brushing: ${history.brushing_frequency}`);
  if (history.flossing_habits) parts.push(`Flossing: ${history.flossing_habits}`);
  if (history.past_treatments_details) parts.push(`Past Tx: ${history.past_treatments_details}`);
  if (history.orthodontic_history === 'yes' || history.orthodontic_history === true) parts.push(`Ortho: Yes (${history.orthodontic_details || 'details missing'})`);
  if (history.bite_issues === 'yes' || history.bite_issues === true) parts.push(`Bite Issues: Yes (${history.bite_symptoms || 'details missing'})`);
  return parts.length > 0 ? parts.join('; ') : 'No specific dental history reported.';
};

// Helper function to format medications array into a list
const formatMedications = (medications: any): React.ReactNode => {
  if (!Array.isArray(medications) || medications.length === 0) return 'None reported.';
  // Basic validation/filtering in case of bad data
  const validMeds = medications.filter(med => med && typeof med === 'object' && med.name);
  if (validMeds.length === 0) return 'None reported.';

  return (
    <ul className="list-disc pl-5 space-y-1 text-sm"> {/* Reduced text size */}
      {validMeds.map((med, index) => (
        <li key={index}>
          <span className="font-medium">{med.name}</span>
          {med.dosage && ` (${med.dosage})`}
          {med.frequency && ` - ${med.frequency}`}
        </li>
      ))}
    </ul>
  );
};

// Helper function to format surgeries array into a list
const formatSurgeries = (surgeries: any): React.ReactNode => {
  if (!Array.isArray(surgeries) || surgeries.length === 0) return 'None reported.';
   // Basic validation/filtering
  const validSurgeries = surgeries.filter(surgery => surgery && typeof surgery === 'object' && surgery.type);
   if (validSurgeries.length === 0) return 'None reported.';

  return (
    <ul className="list-disc pl-5 space-y-1 text-sm"> {/* Reduced text size */}
      {validSurgeries.map((surgery, index) => (
        <li key={index}>
           <span className="font-medium">{surgery.type}</span>
          {surgery.date && ` (Approx. ${surgery.date})`}
          {surgery.notes && <span className="block text-xs text-muted-foreground pl-2">Notes: {surgery.notes}</span>} {/* Notes on new line */}
        </li>
      ))}
    </ul>
  );
};

// Removed StructuredRecordDetails component (moved to MedicalRecordsHistory.tsx)


export function PatientDetailsView({ patient, appointments = [], medicalRecords = [], onEdit, onBookAppointment, onAddMedicalRecord }: PatientDetailsViewProps) {
  // DEBUG LOG: Inspect the patient object received by the view
  console.log('Patient object received in PatientDetailsView:', patient);
  console.log('Appointments received:', appointments); // Log appointments
  console.log('Medical Records received:', medicalRecords); // Log medical records

  if (!patient) return null;

  // Extract documents - ensure it's an array and use the imported type
  const documents: SharedPatientDocument[] = Array.isArray(patient.documents) ? patient.documents : [];

  // Find profile photo specifically
  const profilePhotoDoc = documents.find(doc => doc.type === 'profile_photo');

  // Filter out profile photo for the general list
  const otherDocuments = documents.filter(doc => doc.type !== 'profile_photo');

  // Removed formatRecordType (moved to MedicalRecordsHistory.tsx)

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
           {/* Display Registration Number if available */}
           <DetailItem icon={User} label="Registration Number" value={patient.registration_number} />
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
           <DetailItem icon={User} label="Relationship" value={patient.emergency_contact_relationship} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem icon={Droplet} label="Blood Group" value={patient.blood_group} />
          <DetailItem icon={AlertTriangle} label="Allergies" value={Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies} />
          <DetailItem icon={HeartPulse} label="Medical Conditions" value={Array.isArray(patient.medical_conditions) ? patient.medical_conditions.join(', ') : 'None reported'} />
          {/* Display structured medications and surgeries */}
          <DetailItem icon={HeartPulse} label="Current Medications" value={formatMedications(patient.current_medications)} />
          <DetailItem icon={HeartPulse} label="Previous Surgeries / Hospitalizations" value={formatSurgeries(patient.previous_surgeries)} />
          {/* Display generated summaries from other JSONB fields */}
          <DetailItem icon={FileText} label="Detailed Medical Info" value={generateDetailedMedicalInfoSummary(patient.detailed_medical_info)} />
          <DetailItem icon={FileText} label="Dental History" value={generateDentalHistorySummary(patient.dental_history)} />
          <DetailItem icon={Users} label="Family Medical History" value={generateFamilyHistorySummary(patient.family_medical_history)} />
          <DetailItem icon={Activity} label="Lifestyle Habits" value={generateLifestyleSummary(patient.lifestyle_habits)} />
          <DetailItem icon={MoveVertical} label="Height" value={patient.height ? `${patient.height} cm` : 'N/A'} /> {/* Replaced TextHeight with MoveVertical */}
          <DetailItem icon={Weight} label="Weight" value={patient.weight ? `${patient.weight} kg` : 'N/A'} />
          {/* Removed the direct display of *_summary fields */}
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
                {patient.consent_date && (
                   <p className="text-sm text-muted-foreground mt-1">Date: {formatDateTime(patient.consent_date)}</p>
                )}
                 {/* Display signature if available */}
                 {patient.signature_url && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-muted-foreground">Signature</p>
                      <img src={patient.signature_url} alt="Signature" className="mt-1 max-w-xs max-h-20 rounded border" />
                    </div>
                  )}
              </div>
            </div>

          {/* Show message if no documents */}
          {documents.length === 0 && !profilePhotoDoc && (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          )}
        </CardContent>
      </Card>

      {/* Use the extracted MedicalRecordsHistory component */}
      <MedicalRecordsHistory
        medicalRecords={medicalRecords}
        onAddMedicalRecord={onAddMedicalRecord}
      />

       {/* Existing: Patient Visit History (Appointments) Section - Kept for context */}
       <Card>
         <CardHeader>
           <CardTitle>Appointment History</CardTitle>
         </CardHeader>
         <CardContent>
           {appointments && appointments.length > 0 ? (
             <div className="space-y-4">
               {appointments.map((appt) => (
                 <div key={appt.id} className="p-3 border rounded">
                   <p className="font-semibold">{appt.title || 'Appointment'}</p>
                   <p className="text-sm text-muted-foreground">
                     {formatDateTime(appt.start_time)} - {formatDateTime(appt.end_time)}
                   </p>
                   <p className="text-sm">Type: {appt.type}</p>
                   <p className="text-sm">Status: {appt.status}</p>
                   {appt.notes && <p className="text-sm mt-1">Notes: {appt.notes}</p>}
                   {/* Display associated staff if available */}
                   {appt.staff && (
                     <p className="text-xs text-muted-foreground mt-1">
                       With: {appt.staff.first_name} {appt.staff.last_name}
                     </p>
                   )}
                 </div>
               ))}
             </div>
           ) : (
             <p className="text-sm text-muted-foreground">No past appointments found.</p>
           )}
         </CardContent>
       </Card>


      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mt-6"> {/* Added margin-top */}
         {/* NEW: Book Appointment Button */}
         <Button variant="outline" onClick={() => onBookAppointment(patient.id)}>
           <PlusCircle className="mr-2 h-4 w-4" /> Book New Appointment
         </Button>
        <Button onClick={onEdit}>Edit Profile</Button>
      </div>
    </div>
  );
}