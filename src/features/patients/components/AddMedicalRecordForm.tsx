import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Loader2, Smile, ClipboardList, CheckCircle2, Calendar, DollarSign } from 'lucide-react'; // Added Smile icon
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'; // Import Dialog components
// Removed supabase import
// import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'; // Removed MultiSelectCheckbox import
import DentalChart from '@/features/treatment-plans/components/DentalChart'; // Import DentalChart
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { patientService } from '../services/patientService';

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

 // Explicit type for form values excluding tooth_ids
 export type MedicalRecordFormSchemaValues = Omit<z.infer<typeof medicalRecordSchema>, 'tooth_ids'>;

 interface AddMedicalRecordFormProps {
  patientId: string;
// Update onSubmit prop type to use the explicit schema type
onSubmit: (values: MedicalRecordFormSchemaValues, toothIds: number[]) => Promise<void>; 
onCancel: () => void;
isLoading: boolean;
}

 export function AddMedicalRecordForm({ patientId, onSubmit, onCancel, isLoading }: AddMedicalRecordFormProps) {
   const [selectedRecordType, setSelectedRecordType] = useState<string | undefined>(undefined);
   // State for confirmed selected teeth
   const [selectedToothIds, setSelectedToothIds] = useState<number[]>([]);
   // State for dialog visibility
   const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
   // State for temporary selection within the dialog
   const [dialogSelectedToothIds, setDialogSelectedToothIds] = useState<number[]>([]);
   const [showPlansModal, setShowPlansModal] = useState(false);
   const [plansLoading, setPlansLoading] = useState(false);
   const [completedPlans, setCompletedPlans] = useState<any[]>([]);

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

   // Removed useEffect for fetching teeth

  // Watch the record_type field to update state
  const watchedRecordType = form.watch("record_type");
  useEffect(() => {
    setSelectedRecordType(watchedRecordType);
    // Optionally reset specific fields when type changes if needed
     // form.resetField('consultation_subjective'); // Example
   }, [watchedRecordType]);

   // Handler for selection changes *inside* the dental chart dialog
   const handleDialogChartSelectionChange = (selectedIds: number[]) => {
     setDialogSelectedToothIds(selectedIds);
   };

   // Handler for opening the dialog
   const openChartDialog = () => {
     // Sync temporary state with confirmed state when opening
     setDialogSelectedToothIds([...selectedToothIds]);
     setIsChartDialogOpen(true);
   };

   // Handler for confirming the selection from the dialog
   const handleConfirmChartSelection = () => {
     setSelectedToothIds([...dialogSelectedToothIds]); // Update confirmed state
     setIsChartDialogOpen(false); // Close dialog
   };

  // Update type hint for values
  const handleFormSubmit = async (values: MedicalRecordFormSchemaValues) => { 
    // Pass separated data and selected teeth to parent onSubmit
    await onSubmit(values, selectedToothIds); 
    // Reset selected teeth after submission
     setSelectedToothIds([]);
     // Also reset dialog state if needed, though closing should handle it
     setDialogSelectedToothIds([]);
   };

  const handleShowPlans = async () => {
    setShowPlansModal(true);
    setPlansLoading(true);
    try {
      const allPlans = await patientService.getPatientTreatmentPlans(patientId);
      setCompletedPlans((allPlans || []).filter((plan: any) => plan.status === 'completed'));
    } catch (e) {
      setCompletedPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

   return (
     <> {/* Wrap in Fragment to allow Dialog as sibling */}
       <Form {...form}>
         {/* Wrap form content (excluding buttons) in ScrollArea */}
         <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
           <ScrollArea className="flex-grow pr-6 max-h-[calc(80vh-150px)]"> {/* Adjust max-h as needed, pr-6 for scrollbar space */}
             <div className="space-y-6"> {/* Main content wrapper */}

               {/* --- Fields visible for all types --- */}
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
                        <SelectItem value="examination">Consultation / Examination / Diagnosis</SelectItem> 
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

             {/* --- Button to Open Dental Chart Dialog --- */}
             <FormItem>
               <FormLabel>Select Teeth</FormLabel> {/* Removed (Optional) */}
               <div className="flex items-center gap-4">
                 <Button type="button" variant="outline" onClick={openChartDialog}>
                   <Smile className="mr-2 h-4 w-4" />
                   Select Teeth...
                 </Button>
                 {/* Display Confirmed Selected Teeth */}
                 <div className="text-sm text-muted-foreground flex-grow min-w-0">
                   {selectedToothIds.length > 0 ? (
                     <span className="truncate">
                       Selected: {selectedToothIds.sort((a, b) => a - b).join(', ')}
                     </span>
                   ) : (
                     "No teeth selected"
                   )}
                 </div>
               </div>
               {/* <FormMessage /> */} {/* Can add if validation needed */}
             </FormItem>
             {/* --- End Button --- */}

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
            {/* --- End Fields visible for all types --- */}

            {/* --- Tabs for Type-Specific Fields --- */}
            {selectedRecordType && ( // Only render Tabs container if a type is selected
              <Tabs value={selectedRecordType} className="w-full mt-4">
                {/* No TabsList needed */}
                
                {/* Examination Tab Content */}
                <TabsContent value="examination" className="mt-0 p-0"> 
                  <div className="space-y-4 p-4 border rounded bg-muted/30">
                    <h4 className="font-medium text-sm mb-4">Consultation / Examination / Diagnosis Details</h4>
                    <p className="text-xs text-muted-foreground mb-2">Enter SOAP notes OR Diagnosis details below.</p>
                    <h5 className="font-medium text-xs mb-2">SOAP Notes (Optional)</h5>
                    <div> 
                      <FormField control={form.control} name="consultation_subjective" render={({ field }) => (
                        <FormItem><FormLabel>Subjective</FormLabel><FormControl><Textarea rows={2} placeholder="Patient's complaints, history..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="consultation_objective" render={({ field }) => (
                        <FormItem><FormLabel>Objective</FormLabel><FormControl><Textarea rows={2} placeholder="Clinical findings, exam results..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="consultation_assessment" render={({ field }) => (
                        <FormItem><FormLabel>Assessment</FormLabel><FormControl><Textarea rows={2} placeholder="Diagnosis, differential diagnosis..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="consultation_plan" render={({ field }) => (
                        <FormItem><FormLabel>Plan</FormLabel><FormControl><Textarea rows={2} placeholder="Treatment plan, follow-up..." {...field} /></FormControl><FormMessage /></FormItem>
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
                </TabsContent>
    
                {/* Procedure Tab Content */}
                <TabsContent value="procedure" className="mt-0 p-0">
                  <div className="flex justify-end p-4 border rounded bg-muted/30">
                    <Button type="button" variant="secondary" onClick={handleShowPlans}>
                      <ClipboardList className="w-4 h-4 mr-2" /> Add Treatment Plan Details History
                    </Button>
                  </div>
                </TabsContent>
    
                {/* Prescription Tab Content */}
                <TabsContent value="prescription" className="mt-0 p-0">
                  <div className="space-y-4 p-4 border rounded bg-muted/30">
                    <h4 className="font-medium text-sm">Prescription Details</h4>
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
                </TabsContent>
    
                {/* Lab Result Tab Content */}
                <TabsContent value="lab_result" className="mt-0 p-0">
                  <div className="space-y-4 p-4 border rounded bg-muted/30">
                    <h4 className="font-medium text-sm">Lab Result Details</h4>
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
                </TabsContent>
    
                {/* Note Tab Content */}
                <TabsContent value="note" className="mt-0 p-0">
                  <div className="space-y-4 p-4 border rounded bg-muted/30">
                    <h4 className="font-medium text-sm">Other Note Details</h4>
                    <FormField control={form.control} name="other_details" render={({ field }) => (
                      <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea placeholder="Enter any other relevant details..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </TabsContent>
    
              </Tabs>
            )}
            {/* --- End Tabs --- */}

          </div> {/* Close the main space-y wrapper div */}
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

     {/* Dental Chart Dialog */}
     <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
       <DialogContent className="max-w-2xl"> {/* Wider dialog for chart */}
         <DialogHeader>
           <DialogTitle>Select Affected Teeth</DialogTitle>
           <DialogDescription>
             Click teeth in the chart below to select or deselect them for this medical record.
           </DialogDescription>
         </DialogHeader>

         {/* Render DentalChart inside the dialog */}
         {/* Use dialogSelectedToothIds for initial state display within the dialog */}
         {/* Key can be added if re-mount needed, but maybe not necessary here */}
         <DentalChart
           initialState={dialogSelectedToothIds.reduce((acc, id) => {
             acc[id] = { isSelected: true }; // Set initial selection based on dialog state
             return acc;
           }, {} as any)} // Using 'any' for simplicity, could refine type
           onToothSelect={handleDialogChartSelectionChange}
           // readOnly={false} // Default is false
         />

         <DialogFooter>
           <Button variant="outline" onClick={() => setIsChartDialogOpen(false)}>Cancel</Button>
           <Button onClick={handleConfirmChartSelection}>
             Confirm Selection
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Completed Treatment Plans Modal */}
     <Dialog open={showPlansModal} onOpenChange={setShowPlansModal}>
       <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Completed Treatment Plans</DialogTitle>
         </DialogHeader>
         {plansLoading ? (
           <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading...</div>
         ) : completedPlans.length === 0 ? (
           <div className="text-center text-muted-foreground py-8">No completed treatment plans found.</div>
         ) : (
           <div className="space-y-4">
             {completedPlans.map((plan, idx) => (
               <Card key={plan.id || idx} className="border shadow-sm">
                 <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div className="flex items-center gap-2">
                     <CheckCircle2 className="text-green-500 w-5 h-5" />
                     <CardTitle className="text-lg">{plan.title || 'Treatment Plan'}</CardTitle>
                     <Badge variant="secondary">Completed</Badge>
                   </div>
                   <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-4 h-4" />{plan.end_date ? new Date(plan.end_date).toLocaleDateString() : 'N/A'}</span>
                 </CardHeader>
                 <CardContent className="space-y-2">
                   <div className="flex flex-wrap gap-2 items-center">
                     {plan.teeth && plan.teeth.length > 0 && (
                       <span className="flex items-center gap-1 text-xs"><Smile className="w-4 h-4" />Teeth: {plan.teeth.map((t: any) => t.tooth_id).join(', ')}</span>
                     )}
                     {plan.totalCost && (
                       <span className="flex items-center gap-1 text-xs"><DollarSign className="w-4 h-4" />Cost: {plan.totalCost}</span>
                     )}
                   </div>
                   <div className="text-sm text-muted-foreground">{plan.description}</div>
                   {plan.treatments && plan.treatments.length > 0 && (
                     <div className="mt-2">
                       <div className="font-medium text-xs mb-1">Procedures:</div>
                       <ul className="list-disc pl-5 space-y-1">
                         {plan.treatments.map((treat: any, i: number) => (
                           <li key={treat.id || i} className="text-xs">
                             <span className="font-semibold">{treat.procedures || treat.title}</span>
                             {treat.description && <span className="ml-2 text-muted-foreground">{treat.description}</span>}
                             {treat.status && <Badge className="ml-2" variant={treat.status === 'completed' ? 'secondary' : 'outline'}>{treat.status}</Badge>}
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </CardContent>
               </Card>
             ))}
           </div>
         )}
         <DialogFooter>
           <Button variant="outline" onClick={() => setShowPlansModal(false)}>Close</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>

     {/* Add Record Form */}
     <div className="bg-white rounded-xl border p-6 mb-6">
       <h2 className="text-2xl font-bold mb-4">Treatment Plan</h2>
       <div className="flex justify-end">
         <Button type="button" variant="secondary" onClick={handleShowPlans}>
           <ClipboardList className="w-4 h-4 mr-2" /> View Completed Treatment Plans
         </Button>
       </div>
     </div>
   </> // Close Fragment
 );
}
