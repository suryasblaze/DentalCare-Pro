import React, { useState, useEffect } from 'react'; // Import useEffect
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Re-add single Select imports
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase'; // Import supabase client
import { MultiSelectCheckbox, MultiSelectOption } from '@/components/ui/multi-select-checkbox'; // Import MultiSelectCheckbox

 // Define the schema for the form using DB valid types
 const medicalRecordSchema = z.object({
   record_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
     message: "Invalid date format",
   }),
   // Use database-allowed enum values
   record_type: z.enum([
     "examination", 
     "procedure", 
     "prescription", 
     "lab_result", 
     "note"
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
  // Removed tooth_ids from the main schema
});

// Define type for tooth data
interface Tooth {
  id: number;
  description: string;
}

// Explicit type for form values excluding tooth_ids
type MedicalRecordFormSchemaValues = Omit<z.infer<typeof medicalRecordSchema>, 'tooth_ids'>;

interface AddMedicalRecordFormProps {
  patientId: string;
// Update onSubmit prop type to use the explicit schema type
onSubmit: (values: MedicalRecordFormSchemaValues, toothIds: number[]) => Promise<void>; 
onCancel: () => void;
isLoading: boolean;
}

export function AddMedicalRecordForm({ patientId, onSubmit, onCancel, isLoading }: AddMedicalRecordFormProps) {
  const [selectedRecordType, setSelectedRecordType] = useState<string | undefined>(undefined);
  const [teeth, setTeeth] = useState<Tooth[]>([]); // State for teeth
  const [fetchError, setFetchError] = useState<string | null>(null); // State for fetch error
  // Add separate state for selected teeth
  const [selectedToothIds, setSelectedToothIds] = useState<number[]>([]); 

  // Use the explicit schema type for useForm
  const form = useForm<MedicalRecordFormSchemaValues>({ 
    resolver: zodResolver(medicalRecordSchema), // Keep original schema for validation rules
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
      // Removed tooth_ids default
    },
  });

  // Fetch teeth data on component mount
  useEffect(() => {
    const fetchTeeth = async () => {
      setFetchError(null);
      const { data, error } = await supabase
        .from('teeth')
        .select('id, description')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching teeth:', error);
        setFetchError('Failed to load teeth data.');
        setTeeth([]);
      } else {
        setTeeth(data || []);
      }
    };
    fetchTeeth();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Watch the record_type field to update state
  const watchedRecordType = form.watch("record_type");
  React.useEffect(() => {
    setSelectedRecordType(watchedRecordType);
    // Reset selected teeth when record type changes? Maybe not necessary.
  }, [watchedRecordType]);

  // Handler for teeth selection change
  const handleTeethChange = (selected: (string | number)[]) => {
    const numericIds = selected.map(id => Number(id)).filter(id => !isNaN(id));
    setSelectedToothIds(numericIds);
  };

  // Update type hint for values
  const handleFormSubmit = async (values: MedicalRecordFormSchemaValues) => { 
    // Pass separated data and selected teeth to parent onSubmit
    await onSubmit(values, selectedToothIds); 
    // Reset selected teeth after submission
    setSelectedToothIds([]); 
  };

  return (
    <Form {...form}>
      {/* Wrap form content (excluding buttons) in ScrollArea */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full"> 
        <ScrollArea className="flex-grow pr-6 max-h-[calc(80vh-150px)]"> {/* Adjust max-h as needed, pr-6 for scrollbar space */}
          <div className="space-y-6"> {/* Add a wrapper div for space-y */}
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
                    {/* Use DB values but keep user-friendly labels */}
                    <SelectItem value="examination">Consultation / Examination / Diagnosis</SelectItem> 
                    {/* <SelectItem value="examination">Diagnosis</SelectItem>  Combined into one */}
                    <SelectItem value="procedure">Treatment / Procedure</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="lab_result">Lab Result</SelectItem>
                    <SelectItem value="note">Other Note</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         {/* Tooth Selection Field - Unlink from react-hook-form */}
         <FormItem>
            <FormLabel>Teeth</FormLabel>
            <MultiSelectCheckbox
              options={teeth.map(t => ({ value: t.id, label: `${t.id} - ${t.description}` }))}
              selectedValues={selectedToothIds} // Use separate state
              onChange={handleTeethChange} // Use separate handler
              placeholder="Select teeth..."
              className="w-full"
              disabled={fetchError !== null || teeth.length === 0}
            />
            {fetchError && <FormDescription className="text-destructive">{fetchError}</FormDescription>}
            {/* Manual validation message if needed */}
            {/* <FormMessage /> */} {/* Removed as it's not linked to form state */}
         </FormItem>

        {/* Conditional Fields based on selectedRecordType (using DB values now) */}
        {/* Show SOAP fields for 'examination' */}
        {selectedRecordType === 'examination' && ( 
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm mb-4">Consultation / Examination / Diagnosis Details</h4>
             {/* Allow SOAP notes OR Diagnosis fields for 'examination' type */}
             <p className="text-xs text-muted-foreground mb-2">Enter SOAP notes OR Diagnosis details below.</p>
             <h5 className="font-medium text-xs mb-2">SOAP Notes (Optional)</h5>
            {/* Re-applying removal of grid layout, relying on default block stacking and parent space-y */}
            <div> 
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
             <h5 className="font-medium text-xs mt-4 mb-2">Diagnosis Details (Optional)</h5>
             <FormField control={form.control} name="diagnosis_code" render={({ field }) => (
              <FormItem><FormLabel>Diagnosis Code (e.g., ICD-10)</FormLabel><FormControl><Input placeholder="K02.1" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="diagnosis_description" render={({ field }) => (
              <FormItem><FormLabel>Diagnosis Description</FormLabel><FormControl><Textarea placeholder="Describe the diagnosis..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}
        
        {/* Show Treatment fields for 'procedure' */}
        {selectedRecordType === 'procedure' && ( 
          <div className="space-y-4 p-4 border rounded bg-muted/30">
            <h4 className="font-medium text-sm">Treatment / Procedure Details</h4>
            <FormField control={form.control} name="treatment_procedure" render={({ field }) => (
              <FormItem><FormLabel>Procedure (Code or Name)</FormLabel><FormControl><Input placeholder="e.g., D2391, Composite Filling" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="treatment_details" render={({ field }) => (
              <FormItem><FormLabel>Treatment Notes/Details</FormLabel><FormControl><Textarea placeholder="Materials used, tooth number, outcome..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}
        
        {/* Prescription fields for 'prescription' */}
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
        
        {/* Lab Result fields for 'lab_result' */}
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
        
        {/* Other details for 'note' */}
        {selectedRecordType === 'note' && ( 
           <div className="space-y-4 p-4 border rounded bg-muted/30">
             <h4 className="font-medium text-sm">Other Note Details</h4>
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
          </div> {/* Close the space-y wrapper div */}
        </ScrollArea>

        {/* Keep buttons outside the scroll area */}
        <div className="flex justify-end gap-4 pt-4 border-t mt-4"> {/* Add border-t and mt-4 for separation */}
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
