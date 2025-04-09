import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Define the schema for the form
const medicalRecordSchema = z.object({
  record_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  record_type: z.enum([
    "consultation",
    "diagnosis",
    "treatment",
    "prescription",
    "lab_result",
    "other"
  ], { required_error: "Record type is required" }),
  // General description/notes for all types
  general_notes: z.string().optional(),
  // Type-specific fields (optional)
  consultation_subjective: z.string().optional(),
  consultation_objective: z.string().optional(),
  consultation_assessment: z.string().optional(),
  consultation_plan: z.string().optional(),
  diagnosis_code: z.string().optional(),
  diagnosis_description: z.string().optional(),
  treatment_procedure: z.string().optional(),
  treatment_details: z.string().optional(),
  prescription_medication: z.string().optional(),
  prescription_dosage: z.string().optional(),
  prescription_frequency: z.string().optional(),
  prescription_duration: z.string().optional(),
  lab_test_name: z.string().optional(),
  lab_result_value: z.string().optional(),
  lab_units: z.string().optional(),
  lab_reference_range: z.string().optional(),
  other_details: z.string().optional(),
});

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;

interface AddMedicalRecordFormProps {
  patientId: string;
  // Modify onSubmit to accept the raw form values
  onSubmit: (values: MedicalRecordFormValues) => Promise<void>; 
  onCancel: () => void;
  isLoading: boolean;
}

export function AddMedicalRecordForm({ patientId, onSubmit, onCancel, isLoading }: AddMedicalRecordFormProps) {
  const [selectedRecordType, setSelectedRecordType] = useState<string | undefined>(undefined);

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      record_date: format(new Date(), 'yyyy-MM-dd'),
      record_type: undefined, // Start with no type selected
      general_notes: '',
      consultation_subjective: '',
      consultation_objective: '',
      consultation_assessment: '',
      consultation_plan: '',
      diagnosis_code: '',
      diagnosis_description: '',
      treatment_procedure: '',
      treatment_details: '',
      prescription_medication: '',
      prescription_dosage: '',
      prescription_frequency: '',
      prescription_duration: '',
      lab_test_name: '',
      lab_result_value: '',
      lab_units: '',
      lab_reference_range: '',
      other_details: '',
    },
  });

  // Watch the record_type field to update state
  const watchedRecordType = form.watch("record_type");
  React.useEffect(() => {
    setSelectedRecordType(watchedRecordType);
  }, [watchedRecordType]);

  const handleFormSubmit = async (values: MedicalRecordFormValues) => {
    // The parent component's onSubmit will now handle structuring the data
    await onSubmit(values); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="record_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Record Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="record_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Record Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a record type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation Note</SelectItem>
                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                    <SelectItem value="treatment">Treatment</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="lab_result">Lab Result</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Conditional Fields based on selectedRecordType */}

        {selectedRecordType === 'consultation' && (
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm mb-4">Consultation Details (SOAP)</h4>
            {/* Use a 2-column grid for SOAP fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="consultation_subjective" render={({ field }) => (
                <FormItem><FormLabel>Subjective</FormLabel><FormControl><Textarea rows={4} placeholder="Patient's complaints, history..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="consultation_objective" render={({ field }) => (
                <FormItem><FormLabel>Objective</FormLabel><FormControl><Textarea rows={4} placeholder="Clinical findings, exam results..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="consultation_assessment" render={({ field }) => (
                <FormItem><FormLabel>Assessment</FormLabel><FormControl><Textarea rows={4} placeholder="Diagnosis, differential diagnosis..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="consultation_plan" render={({ field }) => (
                <FormItem><FormLabel>Plan</FormLabel><FormControl><Textarea rows={4} placeholder="Treatment plan, follow-up..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        )}

        {selectedRecordType === 'diagnosis' && (
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm">Diagnosis Details</h4>
            <FormField control={form.control} name="diagnosis_code" render={({ field }) => (
              <FormItem><FormLabel>Diagnosis Code (e.g., ICD-10)</FormLabel><FormControl><Input placeholder="K02.1" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="diagnosis_description" render={({ field }) => (
              <FormItem><FormLabel>Diagnosis Description</FormLabel><FormControl><Textarea placeholder="Describe the diagnosis..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}

        {selectedRecordType === 'treatment' && (
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm">Treatment Details</h4>
            <FormField control={form.control} name="treatment_procedure" render={({ field }) => (
              <FormItem><FormLabel>Procedure (Code or Name)</FormLabel><FormControl><Input placeholder="e.g., D2391, Composite Filling" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="treatment_details" render={({ field }) => (
              <FormItem><FormLabel>Treatment Notes/Details</FormLabel><FormControl><Textarea placeholder="Materials used, tooth number, outcome..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}

        {selectedRecordType === 'prescription' && (
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm">Prescription Details</h4>
             {/* Use grid for prescription fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="prescription_medication" render={({ field }) => (
                <FormItem><FormLabel>Medication Name</FormLabel><FormControl><Input placeholder="Amoxicillin" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="prescription_dosage" render={({ field }) => (
                <FormItem><FormLabel>Dosage</FormLabel><FormControl><Input placeholder="500mg" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="prescription_frequency" render={({ field }) => (
                <FormItem><FormLabel>Frequency</FormLabel><FormControl><Input placeholder="TID (Three times a day)" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="prescription_duration" render={({ field }) => (
                <FormItem><FormLabel>Duration</FormLabel><FormControl><Input placeholder="7 days" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        )}

         {selectedRecordType === 'lab_result' && (
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm">Lab Result Details</h4>
             {/* Use grid for lab fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="lab_test_name" render={({ field }) => (
                <FormItem><FormLabel>Test Name</FormLabel><FormControl><Input placeholder="Complete Blood Count (CBC)" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lab_result_value" render={({ field }) => (
                <FormItem><FormLabel>Result Value</FormLabel><FormControl><Input placeholder="12.5" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lab_units" render={({ field }) => (
                <FormItem><FormLabel>Units</FormLabel><FormControl><Input placeholder="g/dL" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lab_reference_range" render={({ field }) => (
                <FormItem><FormLabel>Reference Range</FormLabel><FormControl><Input placeholder="12.0-15.5 g/dL" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>
        )}

        {selectedRecordType === 'other' && (
           <div className="space-y-4 p-4 border rounded bg-muted/30">
             <h4 className="font-medium text-sm">Other Details</h4>
             <FormField control={form.control} name="other_details" render={({ field }) => (
              <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea placeholder="Enter any other relevant details..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
           </div>
        )}

        {/* General Notes field for all types */}
        <FormField
          control={form.control}
          name="general_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>General Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any general notes applicable to this record..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !selectedRecordType}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Record
          </Button>
        </div>
      </form>
    </Form>
  );
}
