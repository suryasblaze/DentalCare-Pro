import React, { useState } from 'react';import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';import { Button } from '@/components/ui/button';import { PlusCircle } from 'lucide-react';import { Input } from '@/components/ui/input';import { Badge } from '@/components/ui/badge';import { MedicalRecordDetails } from './MedicalRecordDetails';import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stethoscope, AlertCircle, FileText, CircleDot, Pill, FlaskConical, Image as ImageIcon, File, UserCircle } from 'lucide-react';

// Define Medical Record type (consider moving to a shared types file)
interface MedicalRecord {
  id: string;
  patient_id: string | null;
  record_date: string;
  record_type: string; // This is the type stored in the DB (e.g., 'examination', 'procedure')
  description: string; // JSON string with original form details
  attachments?: any | null;
  created_at?: string | null;
  created_by?: string | null;
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  // Add teeth array populated by api.ts
  teeth?: { id: number; description: string }[]; 
}

// Define the processed record type including the displayType
interface ProcessedMedicalRecord extends MedicalRecord {
  displayType: string;
}

interface MedicalRecordsHistoryProps {
  medicalRecords?: MedicalRecord[]; // Expecting records with the 'teeth' array
  onAddMedicalRecord: () => void;
  doctors?: any[]; // Add doctors prop
}

// Helper to format date/time
const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  try {
    // Use more common date/time format options
    return new Date(dateTimeString).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  } catch (e) {
    return dateTimeString; // Fallback if parsing fails
  }
};

// Helper function to format DB record type display name (fallback)
const formatDbRecordType = (type: string) => {
   if (!type) return 'Record';
   return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
 };
 
// New helper to determine the display type based on parsed description content
const getDisplayRecordType = (details: any, dbRecordType: string): string => {
  // Fallback if details are not a valid object
  if (typeof details !== 'object' || details === null) {
    return formatDbRecordType(dbRecordType); 
  }

  // Infer original type from keys present in the description JSON
  if (details.subjective !== undefined || details.objective !== undefined || details.assessment !== undefined || details.plan !== undefined) {
    return "Consultation Note";
  }
  // Check for diagnosis fields (code is a strong indicator)
  if (details.code !== undefined) { 
    return "Diagnosis";
  }
  // Check for treatment procedure
  if (details.procedure !== undefined) { 
    return "Treatment";
  }
  // Check for prescription fields
  if (details.medication !== undefined || details.dosage !== undefined || details.frequency !== undefined || details.duration !== undefined) {
    return "Prescription";
  }
  // Check for lab result fields
  if (details.test_name !== undefined || details.result_value !== undefined || details.units !== undefined || details.reference_range !== undefined) {
    return "Lab Result";
  }
  // Check for 'other' details specifically when db type is 'note'
  if (details.details !== undefined && dbRecordType === 'note') { 
    return "Other";
  }
   // If it's just description and general notes under 'examination', treat as Examination
   if (dbRecordType === 'examination' && details.description !== undefined && Object.keys(details).filter(k => k !== 'general_notes' && k !== 'description').length === 0) {
     return "Examination";
   }
   // If it's just details under 'procedure', treat as Treatment (covers cases where only details were entered)
   if (dbRecordType === 'procedure' && details.details !== undefined && Object.keys(details).filter(k => k !== 'general_notes' && k !== 'details').length === 0) {
     return "Treatment";
   }

  // Fallback to formatting the database type if inference fails
  return formatDbRecordType(dbRecordType);
};

// Update the displayType mapping
const getDisplayType = (record: MedicalRecord): string => {
  switch (record.record_type) {
    case 'dental':
      return 'Dental Record';
    case 'examination':
      return 'Consultation / Examination';
    case 'procedure':
      return 'Treatment / Procedure';
    case 'prescription':
      return 'Prescription';
    case 'lab_result':
      return 'Lab Result';
    case 'note':
      return 'Note';
    default:
      return formatDbRecordType(record.record_type);
  }
};

// Add a helper to render any key-value pairs not already shown
const renderExtraFields = (details: any, excludeKeys: string[] = []) => {
  return Object.entries(details)
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([key, value]) => (
      <div key={key} className="text-sm">
        <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </div>
    ));
};

// Update the StructuredRecordDetails component
const StructuredRecordDetails = ({ record }: { record: MedicalRecord }) => {
  let details: any = null;
  let isJson = false;

  if (typeof record.description === 'string' && 
      record.description.trim().startsWith('{') && 
      record.description.trim().endsWith('}')) {
    try {
      details = JSON.parse(record.description);
      isJson = true;
    } catch (e) {
      console.warn(`Failed to parse description JSON for record ${record.id}`, e);
      isJson = false;
    }
  }

  if (!isJson) {
    return record.description ? (
      <p className="text-sm whitespace-pre-wrap">{record.description}</p>
    ) : (
      <p className="text-sm text-muted-foreground">No details provided.</p>
    );
  }

  if (record.record_type === 'dental') {
    return <DentalRecordDetails details={details} />;
  }

  // For non-dental records, show all fields
  return (
    <div className="text-sm space-y-1 mt-2">
      {Object.entries(details).map(([key, value]) => (
        <div key={key}>
          <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </div>
      ))}
    </div>
  );
};

// Add a helper to get doctor name from ID
const getDoctorName = (doctorId: any, doctors: any[]) => {
  if (!doctorId || !Array.isArray(doctors)) return doctorId;
  const doc = doctors.find(d => d.id === doctorId);
  return doc ? `${doc.first_name} ${doc.last_name}` : doctorId;
};

// Update the DentalRecordDetails component
const DentalRecordDetails = ({ details, doctors = [] }: { details: any, doctors?: any[] }) => {
  return (
    <div className="space-y-4">
      {/* Clinical Examination */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Clinical Examination</h3>
        {details.chief_complaint && <div><strong>Chief Complaint:</strong> {details.chief_complaint}</div>}
        {details.blood_pressure && <div><strong>Blood Pressure:</strong> {details.blood_pressure}</div>}
        {details.pulse_rate && <div><strong>Pulse Rate:</strong> {details.pulse_rate}</div>}
        {details.record_date && <div><strong>Record Date:</strong> {details.record_date}</div>}
        {details.doctor && <div><strong>Doctor:</strong> {getDoctorName(details.doctor, doctors)}</div>}
        {details.extra_oral_exam && <div><strong>Extra-oral Examination:</strong> {details.extra_oral_exam}</div>}
        {details.intra_oral_exam && <div><strong>Intra-oral Examination:</strong> {details.intra_oral_exam}</div>}
        {details.custom_notes && <div><strong>Custom Notes:</strong> {details.custom_notes}</div>}
      </div>
      {/* Diagnosis & Treatment */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Diagnosis & Treatment</h3>
        {details.diagnosis_notes && <div><strong>Diagnosis Notes:</strong> {details.diagnosis_notes}</div>}
        {details.diagnosis_codes && details.diagnosis_codes.length > 0 && <div><strong>Diagnosis Codes:</strong> {details.diagnosis_codes.join(', ')}</div>}
        {details.treatment_phase && <div><strong>Treatment Phase:</strong> {details.treatment_phase}</div>}
        {details.treatment_procedures && details.treatment_procedures.length > 0 && (
          <div>
            <strong>Treatment Procedures:</strong>
            <ul className="ml-4 list-disc">
              {details.treatment_procedures.map((proc: any, idx: number) => (
                <li key={idx}>{proc.title || proc.code}: {proc.description} {proc.tooth_number && `(Tooth ${proc.tooth_number})`} {proc.estimated_cost && `- Est. Cost: $${proc.estimated_cost}`}</li>
              ))}
            </ul>
          </div>
        )}
        {details.custom_notes && <div><strong>Custom Notes:</strong> {details.custom_notes}</div>}
      </div>
      {/* Prescription & Instructions */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Prescription & Instructions</h3>
        {details.prescriptions && details.prescriptions.length > 0 && (
          <div>
            <strong>Prescriptions:</strong>
            <ul className="ml-4 list-disc">
              {details.prescriptions.map((rx: any, idx: number) => (
                <li key={idx}>{rx.medication} {rx.dosage} {rx.frequency && `- ${rx.frequency}`} {rx.duration && `for ${rx.duration}`} {rx.instructions && `- Instructions: ${rx.instructions}`}</li>
              ))}
            </ul>
          </div>
        )}
        {details.home_care_instructions && <div><strong>Home Care Instructions:</strong> {details.home_care_instructions}</div>}
        {details.follow_up_date && <div><strong>Follow-up Date:</strong> {details.follow_up_date}</div>}
        {details.custom_notes && <div><strong>Custom Notes:</strong> {details.custom_notes}</div>}
      </div>
      {/* Lab Results */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Lab Results</h3>
        {details.lab_results && details.lab_results.length > 0 ? (
          <ul className="ml-4 list-disc">
            {details.lab_results.map((lab: any, idx: number) => (
              <li key={idx}>{lab.test_name}: {lab.result_value} {lab.units && lab.units} {lab.reference_range && `(Ref: ${lab.reference_range})`}</li>
            ))}
          </ul>
        ) : <div className="text-muted-foreground">No lab results recorded.</div>}
        {details.custom_notes && <div><strong>Custom Notes:</strong> {details.custom_notes}</div>}
      </div>
      {/* Attachments */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Attachments</h3>
        {details.xray_images && details.xray_images.length > 0 && (
          <div><strong>X-ray Images:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {details.xray_images.map((img: any, idx: number) => img.url ? (
                <img key={idx} src={img.url} alt={img.name || `X-ray ${idx + 1}`} className="rounded border object-cover w-24 h-24" title={img.name} />
              ) : (
                <span key={idx}>{img.name || `X-ray ${idx + 1}`}</span>
              ))}
            </div>
          </div>
        )}
        {details.clinical_photos && details.clinical_photos.length > 0 && (
          <div><strong>Clinical Photos:</strong>
            <div className="flex flex-wrap gap-2 mt-1">
              {details.clinical_photos.map((img: any, idx: number) => img.url ? (
                <img key={idx} src={img.url} alt={img.name || `Photo ${idx + 1}`} className="rounded border object-cover w-24 h-24" title={img.name} />
              ) : (
                <span key={idx}>{img.name || `Photo ${idx + 1}`}</span>
              ))}
            </div>
          </div>
        )}
        {details.documents && details.documents.length > 0 && (
          <div><strong>Documents:</strong>
            <div className="space-y-2 mt-1">
              {details.documents.map((doc: any, idx: number) => doc.url ? (
                <div key={idx} className="flex items-center gap-2">
                  <span>{doc.name || `Document ${idx + 1}`}</span>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                </div>
              ) : (
                <span key={idx}>{doc.name || `Document ${idx + 1}`}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Custom Notes (fallback) */}
      {details.custom_notes && <div><h3 className="font-semibold text-lg mb-2">Custom Notes</h3><div>{details.custom_notes}</div></div>}
      {/* Render any extra fields not already shown */}
      {renderExtraFields(details, [
        'chief_complaint', 'blood_pressure', 'pulse_rate', 'record_date', 'doctor', 'extra_oral_exam', 'intra_oral_exam',
        'diagnosis_notes', 'diagnosis_codes', 'treatment_phase', 'treatment_procedures',
        'prescriptions', 'home_care_instructions', 'follow_up_date',
        'lab_results', 'xray_images', 'clinical_photos', 'documents', 'custom_notes',
      ])}
    </div>
  );
};

const ModernRecordTabs = ({ record, details, doctors = [] }: { record: any, details: any, doctors?: any[] }) => {
  // Helper for blue gradient
  const gradient = 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 text-white';

  // --- Normalize attachments ---
  let attachments: any[] = Array.isArray(record.attachments) ? record.attachments : [];
  if (attachments.length === 0) {
    // Fallback to details.xray_images, details.clinical_photos, details.documents
    if (Array.isArray(details.xray_images)) {
      attachments = attachments.concat(details.xray_images.map((img: any) => ({ ...img, type: 'xray' })));
    }
    if (Array.isArray(details.clinical_photos)) {
      attachments = attachments.concat(details.clinical_photos.map((img: any) => ({ ...img, type: 'photo' })));
    }
    if (Array.isArray(details.documents)) {
      attachments = attachments.concat(details.documents.map((doc: any) => ({ ...doc, type: 'document' })));
    }
  }

  return (
    <div className="rounded-xl shadow-lg border overflow-hidden mb-4">
      <div className={`p-4 ${gradient}`}>
        <div className="flex items-center gap-3">
          <Stethoscope className="h-6 w-6" />
          <span className="text-lg font-bold">{record.displayType}</span>
          <span className="ml-auto text-sm opacity-80">{formatDateTime(record.record_date)?.split(', ').pop()}</span>
        </div>
      </div>
      <div className="bg-white">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full justify-between rounded-none border-b bg-gradient-to-r from-blue-100 to-blue-200">
            <TabsTrigger value="overview" className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-1"><FileText className="h-4 w-4" /> Diagnosis</TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center gap-1"><CircleDot className="h-4 w-4" /> Treatment</TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-1"><Pill className="h-4 w-4" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="lab" className="flex items-center gap-1"><FlaskConical className="h-4 w-4" /> Lab Results</TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> Attachments</TabsTrigger>
            {details.doctor && (
              <TabsTrigger value="doctor" className="flex items-center gap-1"><UserCircle className="h-4 w-4" /> Doctor</TabsTrigger>
            )}
            {details.custom_notes && (
              <TabsTrigger value="custom_notes" className="flex items-center gap-1"><FileText className="h-4 w-4" /> Custom Notes</TabsTrigger>
            )}
          </TabsList>
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4">
            <div className="space-y-2">
              {details.chief_complaint && <div><strong>Chief Complaint:</strong> {details.chief_complaint}</div>}
              {details.vital_signs && (
                <div>
                  <strong>Vital Signs:</strong> BP: {details.vital_signs.blood_pressure} | PR: {details.vital_signs.pulse_rate}
                </div>
              )}
              {details.examination && (
                <div>
                  <strong>Examination:</strong>
                  <div className="ml-4">
                    {details.examination.extra_oral && <div><strong>Extra-oral:</strong> {details.examination.extra_oral}</div>}
                    {details.examination.intra_oral && <div><strong>Intra-oral:</strong> {details.examination.intra_oral}</div>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis" className="p-4">
            {/* Show all diagnosis-related fields, not just details.diagnosis */}
            {details.diagnosis || details.code || details.notes ? (
              <div className="space-y-1">
                {/* Root-level fields */}
                {details.code && <div><strong>Code:</strong> {details.code}</div>}
                {details.notes && <div><strong>Notes:</strong> {details.notes}</div>}
                {/* Nested diagnosis object */}
                {details.diagnosis && typeof details.diagnosis === 'object' && (
                  Object.entries(details.diagnosis).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                    </div>
                  ))
                )}
                {/* Any other diagnosis-related fields */}
                {Object.entries(details)
                  .filter(([key]) => key !== 'diagnosis' && (key.includes('diagnosis') || key === 'code' || key === 'notes'))
                  .map(([key, value]) => (
                    <div key={key}>
                      <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {String(value)}
                    </div>
                  ))}
              </div>
            ) : <div className="text-muted-foreground">No diagnosis recorded.</div>}
          </TabsContent>
          {/* Treatment Tab */}
          <TabsContent value="treatment" className="p-4">
            {details.treatment ? (
              <div>
                <strong>Phase:</strong> {details.treatment.phase}<br />
                <strong>Procedures:</strong>
                <ul className="ml-4 list-disc">
                  {details.treatment.procedures && details.treatment.procedures.map((proc: any, idx: number) => (
                    <li key={idx}>{proc.title || proc.code}: {proc.description} {proc.tooth_number && `(Tooth ${proc.tooth_number})`} {proc.estimated_cost && `- Est. Cost: $${proc.estimated_cost}`}</li>
                  ))}
                </ul>
              </div>
            ) : <div className="text-muted-foreground">No treatment recorded.</div>}
          </TabsContent>
          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="p-4">
            {details.prescriptions && details.prescriptions.length > 0 ? (
              <ul className="ml-4 list-disc">
                {details.prescriptions.map((rx: any, idx: number) => (
                  <li key={idx}>{rx.medication} {rx.dosage} {rx.frequency && `- ${rx.frequency}`} {rx.duration && `for ${rx.duration}`} {rx.instructions && `- Instructions: ${rx.instructions}`}</li>
                ))}
              </ul>
            ) : <div className="text-muted-foreground">No prescriptions recorded.</div>}
          </TabsContent>
          {/* Lab Results Tab */}
          <TabsContent value="lab" className="p-4">
            {details.lab_results && details.lab_results.length > 0 ? (
              <ul className="ml-4 list-disc">
                {details.lab_results.map((lab: any, idx: number) => (
                  <li key={idx}>{lab.test_name}: {lab.result_value} {lab.units && lab.units} {lab.reference_range && `(Ref: ${lab.reference_range})`}</li>
                ))}
              </ul>
            ) : <div className="text-muted-foreground">No lab results recorded.</div>}
          </TabsContent>
          {/* Attachments Tab */}
          <TabsContent value="attachments" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* X-ray Images */}
              {attachments.filter(a => a.type === 'xray').length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1 flex items-center gap-1"><ImageIcon className="h-4 w-4 text-blue-500" /> X-ray Images</h5>
                  <div className="flex flex-wrap gap-2">
                    {attachments.filter(a => a.type === 'xray').map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        alt={img.name || `X-ray ${idx + 1}`}
                        className="rounded border object-cover w-24 h-24 cursor-pointer hover:scale-105 transition-transform"
                        title={img.name}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Clinical Photos */}
              {attachments.filter(a => a.type === 'photo').length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1 flex items-center gap-1"><ImageIcon className="h-4 w-4 text-blue-500" /> Clinical Photos</h5>
                  <div className="flex flex-wrap gap-2">
                    {attachments.filter(a => a.type === 'photo').map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        alt={img.name || `Photo ${idx + 1}`}
                        className="rounded border object-cover w-24 h-24 cursor-pointer hover:scale-105 transition-transform"
                        title={img.name}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Documents */}
              {attachments.filter(a => a.type === 'document').length > 0 && (
                <div className="md:col-span-2">
                  <h5 className="text-sm font-medium mb-1 flex items-center gap-1"><File className="h-4 w-4 text-blue-500" /> Documents</h5>
                  <div className="space-y-2">
                    {attachments.filter(a => a.type === 'document').map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{doc.name}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          {/* Doctor Tab */}
          <TabsContent value="doctor" className="p-4">
            {details.doctor ? (
              <div><strong>Doctor:</strong> {getDoctorName(details.doctor, doctors)}</div>
            ) : <div className="text-muted-foreground">No doctor recorded.</div>}
          </TabsContent>
          {/* Custom Notes Tab */}
          <TabsContent value="custom_notes" className="p-4">
            {details.custom_notes ? (
              <div><strong>Custom Notes:</strong> {details.custom_notes}</div>
            ) : <div className="text-muted-foreground">No custom notes recorded.</div>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export function MedicalRecordsHistory({ medicalRecords = [], onAddMedicalRecord, doctors = [] }: MedicalRecordsHistoryProps) {
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedRecord, setSelectedRecord] = useState<ProcessedMedicalRecord | null>(null);
   const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
 
   // Pre-process records to determine display type
   const processedRecords: ProcessedMedicalRecord[] = medicalRecords.map(record => {
     let details = null;
     try {
       if (typeof record.description === 'string') {
         details = JSON.parse(record.description);
       }
     } catch (e) { 
       console.warn(`Failed to parse description for record ${record.id}:`, record.description, e);
     }
     
     return {
       ...record,
       displayType: getDisplayType(record) 
     };
   });
 
   // Filter records based on search term
   const filteredRecords = processedRecords.filter((record) => {
     const teethString = record.teeth?.map(t => t.id).join(' ') || '';
     const recordString = JSON.stringify({...record, description: '', teeth: ''}).toLowerCase(); // Avoid searching raw description/teeth objects
     const detailsString = typeof record.description === 'string' ? record.description.toLowerCase() : ''; // Search description separately if needed
     
     const searchLower = searchTerm.toLowerCase();
     return recordString.includes(searchLower) || 
             detailsString.includes(searchLower) ||
             teethString.includes(searchLower);
   });
 
   // --- Group records by date ---
   const groupedRecords = filteredRecords.reduce((acc, record) => {
     const recordDate = record.record_date ? new Date(record.record_date).toLocaleDateString(undefined, {
       year: 'numeric', month: 'short', day: 'numeric'
     }) : 'Unknown Date';
 
     if (!acc[recordDate]) {
       acc[recordDate] = [];
     }
     // Add to the beginning of the array to keep recent records first within the date group
     acc[recordDate].unshift(record); 
     return acc;
   }, {} as Record<string, ProcessedMedicalRecord[]>);
 
   // Sort dates chronologically (most recent first)
   const sortedDates = Object.keys(groupedRecords).sort((a, b) => {
     // Handle 'Unknown Date' safely
     if (a === 'Unknown Date') return 1; 
     if (b === 'Unknown Date') return -1;
     return new Date(b).getTime() - new Date(a).getTime();
   });
 
   // --- State for expanded dates ---
   const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
 
   const toggleDateExpansion = (date: string) => {
     setExpandedDates(prev => {
       const newSet = new Set(prev);
       if (newSet.has(date)) {
         newSet.delete(date);
       } else {
         newSet.add(date);
       }
       return newSet;
     });
   };
   // --- End grouping and state ---
 
   return (
     <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medical Records History</CardTitle>
        <Button
          onClick={onAddMedicalRecord}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-5 py-2 text-base shadow-md transition-all duration-150 flex items-center gap-2"
          size="lg"
        >
          <PlusCircle className="h-5 w-5" />
          Add Record
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records (type, details, teeth...)"
          />
        </div>
        {sortedDates.length > 0 ? (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const recordsForDate = groupedRecords[date];
              const isExpanded = expandedDates.has(date);

              return (
                <div key={date}>
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <h3 className="text-lg font-medium">{date}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDateExpansion(date)}
                    >
                      {isExpanded ? 'Hide Details' : `View Details (${recordsForDate.length})`}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                      {recordsForDate.map((record) => {
                        let details = {};
                        try {
                          if (typeof record.description === 'string') {
                            details = JSON.parse(record.description);
                          }
                        } catch (e) {}
                        return (
                          <ModernRecordTabs key={record.id} record={record} details={details} doctors={doctors} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No medical records found{searchTerm ? ' matching your search' : ''}.</p>
        )}
      </CardContent>
    </Card>
  );
}
