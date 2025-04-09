import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

// Define Medical Record type (consider moving to a shared types file)
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
}

interface MedicalRecordsHistoryProps {
  medicalRecords?: MedicalRecord[];
  onAddMedicalRecord: () => void;
}

// Helper to format date/time (copied from PatientDetailsView)
const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  try {
    return new Date(dateTimeString).toLocaleString();
  } catch (e) {
    return dateTimeString; // Fallback if parsing fails
  }
};

// Helper function to format record type display name (copied from PatientDetailsView)
const formatRecordType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper component to display structured record details (copied from PatientDetailsView)
const StructuredRecordDetails = ({ record }: { record: MedicalRecord }) => {
  let details: any = null;
  try {
    details = JSON.parse(record.description);
  } catch (e) {
    return <p className="text-sm whitespace-pre-wrap">{record.description}</p>;
  }

  if (typeof details !== 'object' || details === null) {
     return <p className="text-sm whitespace-pre-wrap">{record.description}</p>;
  }

  return (
    <div className="text-sm space-y-1 mt-2">
      {details.general_notes && <p><strong>General Notes:</strong> {details.general_notes}</p>}
      {record.record_type === 'consultation' && (
        <>
          {details.subjective && <p><strong>Subjective:</strong> {details.subjective}</p>}
          {details.objective && <p><strong>Objective:</strong> {details.objective}</p>}
          {details.assessment && <p><strong>Assessment:</strong> {details.assessment}</p>}
          {details.plan && <p><strong>Plan:</strong> {details.plan}</p>}
        </>
      )}
      {record.record_type === 'diagnosis' && (
        <>
          {details.code && <p><strong>Code:</strong> {details.code}</p>}
          {details.description && <p><strong>Description:</strong> {details.description}</p>}
        </>
      )}
       {record.record_type === 'treatment' && (
        <>
          {details.procedure && <p><strong>Procedure:</strong> {details.procedure}</p>}
          {details.details && <p><strong>Details:</strong> {details.details}</p>}
        </>
      )}
       {record.record_type === 'prescription' && (
        <>
          {details.medication && <p><strong>Medication:</strong> {details.medication}</p>}
          {details.dosage && <p><strong>Dosage:</strong> {details.dosage}</p>}
          {details.frequency && <p><strong>Frequency:</strong> {details.frequency}</p>}
          {details.duration && <p><strong>Duration:</strong> {details.duration}</p>}
        </>
      )}
       {record.record_type === 'lab_result' && (
        <>
          {details.test_name && <p><strong>Test:</strong> {details.test_name}</p>}
          {details.result_value && <p><strong>Result:</strong> {details.result_value} {details.units || ''}</p>}
          {details.reference_range && <p><strong>Range:</strong> {details.reference_range}</p>}
        </>
      )}
       {record.record_type === 'other' && (
        <>
          {details.details && <p><strong>Details:</strong> {details.details}</p>}
        </>
      )}
    </div>
  );
};


export function MedicalRecordsHistory({ medicalRecords = [], onAddMedicalRecord }: MedicalRecordsHistoryProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medical Records History</CardTitle>
        <Button variant="outline" size="sm" onClick={onAddMedicalRecord}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Record
        </Button>
      </CardHeader>
      <CardContent>
        {medicalRecords && medicalRecords.length > 0 ? (
          <div className="space-y-4">
            {medicalRecords.map((record) => (
              <div key={record.id} className="p-3 border rounded">
                <p className="font-semibold">{formatRecordType(record.record_type || 'record')}</p>
                <p className="text-sm text-muted-foreground">
                  Date: {formatDateTime(record.record_date)}
                </p>
                <StructuredRecordDetails record={record} />
                {record.staff && (
                   <p className="text-xs text-muted-foreground mt-1">
                     Recorded by: {record.staff.first_name} {record.staff.last_name}
                   </p>
                )}
                 {record.attachments && (
                   <p className="text-sm mt-1">Attachments: {JSON.stringify(record.attachments)}</p>
                 )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No medical records found.</p>
        )}
      </CardContent>
    </Card>
  );
}
