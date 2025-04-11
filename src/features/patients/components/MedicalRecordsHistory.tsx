import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; // Import Badge

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

// Helper component to display structured record details
const StructuredRecordDetails = ({ record }: { record: MedicalRecord }) => {
  let details: any = null;
  try {
    // Ensure description is a string before parsing
    if (typeof record.description === 'string') {
      details = JSON.parse(record.description);
    } else {
       // If description is not a string (e.g., already an object somehow?), use it directly
       // Or handle as an error/fallback case
       console.warn(`Record description is not a string for record ${record.id}`);
       return <p className="text-sm text-muted-foreground">Could not display details.</p>;
    }
  } catch (e) {
    // If parsing fails, display the raw description (if it's a simple string)
    console.warn(`Failed to parse description JSON for record ${record.id}:`, e);
    return <p className="text-sm whitespace-pre-wrap">{record.description}</p>;
  }

  // If details couldn't be parsed or are not an object, show fallback
  if (typeof details !== 'object' || details === null) {
     return <p className="text-sm whitespace-pre-wrap">{record.description || 'No details available.'}</p>;
  }

  // Display logic based on DB record_type, accessing keys from original form structure
  return (
    <div className="text-sm space-y-1 mt-2">
      {details.general_notes && <p><strong>General Notes:</strong> {details.general_notes}</p>}

      {/* Display fields based on the actual keys present in the 'details' object */}
      {/* Consultation/SOAP */}
      {details.subjective && <p><strong>Subjective:</strong> {details.subjective}</p>}
      {details.objective && <p><strong>Objective:</strong> {details.objective}</p>}
      {details.assessment && <p><strong>Assessment:</strong> {details.assessment}</p>}
      {details.plan && <p><strong>Plan:</strong> {details.plan}</p>}
      
      {/* Diagnosis */}
      {details.code && <p><strong>Code:</strong> {details.code}</p>}
      {/* Show description only if it's likely the main content (not part of SOAP) */}
      {details.description && !details.subjective && <p><strong>Description:</strong> {details.description}</p>} 

      {/* Treatment */}
      {details.procedure && <p><strong>Procedure:</strong> {details.procedure}</p>}
      {/* Show details only if it's likely the main content (not part of procedure name) */}
      {details.details && !details.procedure && <p><strong>Details:</strong> {details.details}</p>} 
      {/* Or always show details if present? */}
      {/* {details.details && <p><strong>Details:</strong> {details.details}</p>} */}


      {/* Prescription */}
      {details.medication && <p><strong>Medication:</strong> {details.medication}</p>}
      {details.dosage && <p><strong>Dosage:</strong> {details.dosage}</p>}
      {details.frequency && <p><strong>Frequency:</strong> {details.frequency}</p>}
      {details.duration && <p><strong>Duration:</strong> {details.duration}</p>}
      
      {/* Lab Result */}
      {details.test_name && <p><strong>Test:</strong> {details.test_name}</p>}
      {details.result_value && <p><strong>Result:</strong> {details.result_value} {details.units || ''}</p>}
      {details.reference_range && <p><strong>Range:</strong> {details.reference_range}</p>}
      
      {/* Other (Only show 'details' if it's the primary content for 'note' type) */}
      {details.details && record.record_type === 'note' && <p><strong>Details:</strong> {details.details}</p>}

    </div>
  );
};


export function MedicalRecordsHistory({ medicalRecords = [], onAddMedicalRecord }: MedicalRecordsHistoryProps) {
   const [searchTerm, setSearchTerm] = useState('');
 
   // Pre-process records to determine display type
   const processedRecords: ProcessedMedicalRecord[] = medicalRecords.map(record => {
     let details = null;
     try {
       // Ensure description is a string before parsing
       if (typeof record.description === 'string') {
         details = JSON.parse(record.description);
       }
     } catch (e) { 
       console.warn(`Failed to parse description for record ${record.id}:`, record.description, e);
     }
     
     return {
       ...record,
       // Safely pass details (which might be null) and record_type
       displayType: getDisplayRecordType(details, record.record_type || '') 
     };
   });
 
   const filteredRecords = processedRecords.filter((record) => {
     // Include displayType and teeth in search string
     const teethString = record.teeth?.map(t => t.id).join(' ') || '';
     const recordString = JSON.stringify({...record, description: '', teeth: ''}).toLowerCase(); // Avoid searching raw description/teeth objects
     const detailsString = typeof record.description === 'string' ? record.description.toLowerCase() : ''; // Search description separately if needed
     
     const searchLower = searchTerm.toLowerCase();
     return recordString.includes(searchLower) || 
            detailsString.includes(searchLower) || 
            teethString.includes(searchLower);
   });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medical Records History</CardTitle>
        <Button variant="outline" size="sm" onClick={onAddMedicalRecord}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Record
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
         {filteredRecords && filteredRecords.length > 0 ? (
           <div className="space-y-4">
             {/* Use filteredRecords (which are processed) for mapping */}
             {filteredRecords.map((record) => ( 
               <div key={record.id} className="p-3 border rounded">
                 {/* Use the pre-calculated displayType */}
                 <p className="font-semibold">{record.displayType}</p>
                 <p className="text-sm text-muted-foreground">
                   Date: {formatDateTime(record.record_date)}
                 </p>
                <StructuredRecordDetails record={record} />
                {record.staff && (
                   <p className="text-xs text-muted-foreground mt-1">
                     Recorded by: {record.staff.first_name} {record.staff.last_name}
                   </p>
                )}
                {/* Display Teeth Information */}
                {record.teeth && record.teeth.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Associated Teeth:</p>
                    <div className="flex flex-wrap gap-1">
                      {record.teeth.map(tooth => (
                        // Use Badge component for better styling
                        <Badge key={tooth.id} variant="secondary" className="text-xs font-normal"> 
                          {tooth.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                 {record.attachments && record.attachments.length > 0 && ( // Check if attachments array has items
                   <div className="mt-2 pt-2 border-t border-dashed">
                     <p className="text-xs font-medium text-muted-foreground mb-1">Attachments:</p>
                     {/* TODO: Implement proper attachment display/download links */}
                     <p className="text-sm">{JSON.stringify(record.attachments)}</p> 
                   </div>
                 )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No medical records found{searchTerm ? ' matching your search' : ''}.</p>
        )}
      </CardContent>
    </Card>
  );
}
