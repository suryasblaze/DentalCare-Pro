// src/features/patients/components/PatientDetailsView.tsx
import React, { useState, useEffect } from 'react'; // <<< Added useState, useEffect
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Added Users, Activity, MoveVertical (for Height), Weight, FileText icons
import { Phone, Mail, MapPin, User, Users, HeartPulse, AlertTriangle, Droplet, Image as ImageIcon, CheckSquare, Paperclip, CalendarClock, PlusCircle, Activity, MoveVertical, Weight, FileText } from 'lucide-react';

// Removed local Appointment interface definition

import { Appointment, PatientDocument as SharedPatientDocument } from '@/types'; // Import Appointment type and rename PatientDocument to avoid conflict
import { MedicalRecordsHistory } from './MedicalRecordsHistory'; // Import the new component
import teethSvgUrl from '/teethselectdiagram.svg?url';
// Import ToothCondition type if needed, or define locally
import { ToothCondition } from '@/features/treatment-plans/components/DentalChart';

// Define type for a selected tooth from dental history
// Define type for a selected tooth from dental history, now including conditions
export interface PatientDentalHistoryTooth {
  tooth_id: number;
  conditions?: string[] | null; // Add conditions array (can be null or undefined)
}


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
  dentalHistoryTeeth?: PatientDentalHistoryTooth[]; // <<< Use new prop for dental history teeth
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
// Removed formatToothConditions helper function as conditions are no longer displayed here


export function PatientDetailsView({
  patient,
  appointments = [],
  medicalRecords = [],
  dentalHistoryTeeth = [], // <<< Destructure new prop with default
  onEdit,
  onBookAppointment,
  onAddMedicalRecord
}: PatientDetailsViewProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null); // State for SVG content
  const [svgLoading, setSvgLoading] = useState<boolean>(true); // <<< Add state for SVG loading

  // Fetch SVG content on mount
  useEffect(() => {
    setSvgLoading(true); // Start loading
    // Fetch using the imported URL
    fetch(teethSvgUrl) 
      .then(response => {
        if (!response.ok) {
          console.error("SVG Fetch Response Status:", response.status, response.statusText); // Log status
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        setSvgContent(text);
        setSvgLoading(false); // Finish loading SVG
      })
      .catch(error => {
        console.error('Error fetching SVG:', error);
        setSvgLoading(false); // Finish loading SVG (even on error)
        // Optionally set an error state here
      });
  }, []);


  // DEBUG LOG: Inspect the patient object received by the view
  console.log('Patient object received in PatientDetailsView:', patient);
  console.log('Appointments received:', appointments);
  console.log('Medical Records received:', medicalRecords);
  // <<< Log the raw dentalHistoryTeeth prop >>>
  console.log('PatientDetailsView received dentalHistoryTeeth prop:', JSON.stringify(dentalHistoryTeeth, null, 2));

  if (!patient) return null;

  // Extract documents - ensure it's an array and use the imported type
  const documents: SharedPatientDocument[] = Array.isArray(patient.documents) ? patient.documents : [];

  // Find profile photo specifically
  const profilePhotoDoc = documents.find(doc => doc.type === 'profile_photo');

  // Filter out profile photo for the general list
  const otherDocuments = documents.filter(doc => doc.type !== 'profile_photo');
// Removed formatRecordType (moved to MedicalRecordsHistory.tsx)
// Removed conditionColors map and getPrimaryCondition helper function as they are no longer needed

// Define the mapping from condition value to display label (copied from DentalChart)
const conditionLabels: Record<ToothCondition, string> = {
  healthy: 'Healthy',
  decayed: 'Decayed',
  filled: 'Filled',
  missing: 'Missing',
  'treatment-planned': 'Planned Tx',
  'root-canal': 'Root Canal',
  extraction: 'Extraction',
  crown: 'Crown',
  'has-treatment-before': 'Prior Tx',
  'recommended-to-be-treated': 'Recommend Tx',
};

// Helper function to get the display label for a condition value
const getConditionLabel = (conditionValue: ToothCondition): string => {
  return conditionLabels[conditionValue] || conditionValue.replace(/_/g, ' '); // Fallback formatting
};


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
          <CardTitle>Medical & Dental Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6"> {/* Use space-y for vertical stacking of sections */}
          {/* Vitals & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailItem icon={MoveVertical} label="Height" value={patient.height ? `${patient.height} cm` : 'N/A'} />
            <DetailItem icon={Weight} label="Weight" value={patient.weight ? `${patient.weight} kg` : 'N/A'} />
            <DetailItem icon={Droplet} label="Blood Group" value={patient.blood_group} />
          </div>

          {/* Conditions & Allergies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
             <DetailItem icon={AlertTriangle} label="Allergies" value={Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies || 'None reported'} />
             <DetailItem icon={HeartPulse} label="Medical Conditions" value={Array.isArray(patient.medical_conditions) ? patient.medical_conditions.join(', ') : patient.medical_conditions || 'None reported'} />
          </div>

           {/* Medications & Surgeries */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
             <DetailItem icon={HeartPulse} label="Current Medications" value={formatMedications(patient.current_medications)} />
             <DetailItem icon={HeartPulse} label="Previous Surgeries / Hospitalizations" value={formatSurgeries(patient.previous_surgeries)} />
           </div>

          {/* History Summaries */}
          <div className="space-y-4 pt-4 border-t">
             <h4 className="text-sm font-medium text-muted-foreground mb-2">History & Habits</h4>
             <DetailItem icon={FileText} label="Detailed Medical Info" value={generateDetailedMedicalInfoSummary(patient.detailed_medical_info)} />
             <DetailItem icon={FileText} label="Dental History Summary" value={generateDentalHistorySummary(patient.dental_history)} />
             <DetailItem icon={Users} label="Family Medical History" value={generateFamilyHistorySummary(patient.family_medical_history)} />
             <DetailItem icon={Activity} label="Lifestyle Habits" value={generateLifestyleSummary(patient.lifestyle_habits)} />
          </div>

          {/* --- Affected Teeth Section --- */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Affected Teeth</h4>
            {svgLoading ? (
              <p className="text-sm text-muted-foreground">Loading tooth chart...</p>
            ) : !svgContent ? (
              <p className="text-sm text-red-500">Error loading tooth chart SVG.</p>
            ) : Array.isArray(dentalHistoryTeeth) && dentalHistoryTeeth.length > 0 ? (
              // Render the tooth SVGs based on dentalHistoryTeeth
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {dentalHistoryTeeth
                  .sort((a, b) => a.tooth_id - b.tooth_id) // Sort by tooth number
                  .map((historyTooth) => {
                    let toothSvgHtml = '<p class="text-xs text-red-500">Not found</p>'; // Default if not found
                    try {
                      const parser = new DOMParser();
                      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
                      const gElement = svgDoc.getElementById(`ID_${historyTooth.tooth_id}`);

                      if (gElement) {
                        // Clone to avoid modifying the parsed document if reused
                        const clonedG = gElement.cloneNode(true) as SVGGElement;

                        // --- Attempt to get bounding box for viewBox ---
                        // Note: getBBox might not work reliably without rendering in DOM first.
                        // We'll use a fixed viewBox and scale/translate as a fallback.
                        let viewBox = "0 0 50 50"; // Default fallback viewBox
                        let transform = "scale(0.5) translate(-50, -50)";

                        try {
                            // Create a temporary SVG to measure bbox (might not work server-side or in all envs)
                            // This might still be useful for positioning, even without conditions
                            const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                            tempSvg.style.position = 'absolute';
                            tempSvg.style.visibility = 'hidden';
                            tempSvg.appendChild(clonedG.cloneNode(true));
                            document.body.appendChild(tempSvg);
                            const bbox = (tempSvg.firstChild as SVGGElement).getBBox();
                            document.body.removeChild(tempSvg);

                            if (bbox && bbox.width > 0 && bbox.height > 0) {
                                // Add some padding
                                const padding = 10;
                                viewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
                                // No transform needed if viewBox is accurate
                                transform = "";
                            } else {
                                console.warn(`Could not get valid BBox for tooth ${historyTooth.tooth_id}. Using fallback viewBox/transform.`);
                            }
                        } catch (e) {
                             console.warn(`Error getting BBox for tooth ${historyTooth.tooth_id}:`, e, ". Using fallback viewBox/transform.");
                        }
                        // --- End BBox attempt ---

                        // Apply default styling (no condition-based colors)
                        const defaultFillColor = '#FFFFFF'; // White fill
                        const defaultStrokeColor = '#666666'; // Gray stroke
                        const defaultStrokeWidth = '0.5';

                        const paths = clonedG.querySelectorAll('path');
                        paths.forEach(path => {
                          path.setAttribute('fill', defaultFillColor);
                          path.setAttribute('stroke', defaultStrokeColor);
                          path.setAttribute('stroke-width', defaultStrokeWidth);
                        });

                        // Construct the innerHTML for the small SVG
                        const gHtml = clonedG.outerHTML;
                        // Use calculated or fallback viewBox/transform
                        // Increase SVG size slightly
                        toothSvgHtml = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" width="40" height="40"><g ${transform ? `transform="${transform}"` : ''}>${gHtml}</g></svg>`;
                      } else {
                          console.warn(`SVG element for tooth ID_${historyTooth.tooth_id} not found.`);
                      }
                    } catch (parseError) {
                      console.error("Error parsing SVG content:", parseError);
                      toothSvgHtml = '<p class="text-xs text-red-500">Parse error</p>';
                    }

                    // Container div for each tooth
                    return (
                      <div
                        key={historyTooth.tooth_id}
                        className="flex flex-col items-center border p-2 rounded-md shadow-sm bg-white hover:shadow-md transition-shadow duration-150"
                        title={`Tooth ${historyTooth.tooth_id}`} // Simple title
                      >
                        <span className="text-xs font-bold text-gray-700">T{historyTooth.tooth_id}</span>
                        <div dangerouslySetInnerHTML={{ __html: toothSvgHtml }} className="my-1" />
                        {/* Display conditions if available */}
                        {/* Display conditions if available, using the label mapping */}
                        {historyTooth.conditions && historyTooth.conditions.length > 0 && (
                          <div className="mt-1 text-center">
                            {historyTooth.conditions
                              // Optional: Filter out 'healthy' if other conditions exist
                              .filter(cond => !(historyTooth.conditions && historyTooth.conditions.length > 1 && cond === 'healthy'))
                              .map((conditionValue, index) => (
                                <span key={index} className="block text-[10px] leading-tight text-blue-600">
                                  {getConditionLabel(conditionValue as ToothCondition)} {/* Use helper to get label */}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : Array.isArray(dentalHistoryTeeth) && dentalHistoryTeeth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No affected teeth selected in dental history.</p> // Updated message
            ) : (
              // Fallback if dentalHistoryTeeth is not an array (shouldn't happen with default [])
              <p className="text-sm text-muted-foreground">Loading affected teeth data...</p>
            )}
          </div>
          {/* --- End Affected Teeth SVGs --- */}

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
                     {/* Document name and type spans */}
                     <span className="text-sm truncate" title={doc.name}>{doc.name}</span>
                     <span className="text-xs text-muted-foreground">({doc.type})</span>
                   </div>
                   {/* View document link */}
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
