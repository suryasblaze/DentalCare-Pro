import { z } from "zod";
import { useFormContext, ControllerRenderProps, FieldValues } from 'react-hook-form'; // Import ControllerRenderProps and FieldValues
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import React from 'react'; // Removed RefObject import
// Removed duplicate useFormContext import, it's already imported above
// Removed unused Controller import
// Import the new ToothSelector component and its types
import ToothSelector, { ToothConditionsMap } from '@/features/treatment-plans/components/ToothSelector';
import { ToothCondition } from '@/features/treatment-plans/components/DentalChart'; // Import ToothCondition enum/type
// Keep DentalChart imports only if needed elsewhere, otherwise remove
// import DentalChart, {
//   type DentalChartHandle,
//   type InitialToothState,
//   type ToothCondition,
// } from '@/features/treatment-plans/components/DentalChart'; // Import DentalChart and types
// Assuming a DatePicker component exists or needs to be created/imported
// import { DatePicker } from "@/components/ui/date-picker";

// Define the schema for DETAILED dental history
export const dentalHistorySchema = z.object({
  // Reason for Visit & Chief Complaint
  dh_reason_for_visit: z.enum(['routine_checkup', 'tooth_pain', 'gum_issues', 'sensitivity', 'cosmetic_concerns', 'other']).optional(),
  dh_reason_for_visit_other: z.string().optional(),
  dh_chief_complaint: z.string().optional(), // New detailed field
  // Pain & Sensitivity Details
  dh_has_pain: z.enum(['yes', 'no']).optional(),
  dh_pain_description: z.string().optional(), // More detailed description
  dh_pain_scale: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']).optional(),
  dh_pain_duration_onset: z.string().optional(), // New field
  // Previous Dental Treatments & Procedures (Using Checkboxes)
  dh_past_treatments: z.array(z.string()).optional(), // Array of selected treatment IDs
  dh_past_treatments_other: z.string().optional(), // Details for "Other" option
  // Oral Hygiene Routine & Home Care
  dh_brushing_frequency: z.enum(['less_than_once', 'once_a_day', 'twice_a_day', 'more_than_twice']).optional(),
  dh_flossing_habits: z.enum(['yes_daily', 'no', 'occasionally']).optional(), // Updated options
  dh_additional_hygiene_products: z.string().optional(), // Changed from array to string for simplicity
  dh_technique_tools: z.string().optional(), // New field
  // History of Orthodontic Treatment
  dh_orthodontic_history: z.enum(['yes', 'no']).optional(),
  dh_orthodontic_details: z.string().optional(), // New field
  // Dental Records & X-Rays
  dh_has_records: z.enum(['yes', 'no']).optional(),
  dh_xray_frequency: z.string().optional(), // New field
  // Occlusal & Bite Concerns
  dh_bite_issues: z.enum(['yes', 'no']).optional(),
  dh_bite_symptoms: z.string().optional(), // New field
  // Aesthetic & Functional Concerns
  dh_cosmetic_concerns: z.enum(['yes', 'no']).optional(),
  dh_cosmetic_issues_details: z.string().optional(), // New field
  dh_functional_concerns: z.string().optional(), // New field
  // Previous Dental Emergencies & Urgent Care
  dh_emergency_history: z.enum(['yes', 'no']).optional(),
  dh_emergency_details: z.string().optional(), // New field
  // Additional Comments & Future Dental Goals
  dh_additional_summary: z.string().optional(), // New field
  dh_future_goals: z.string().optional(), // New field
  // Removed confirmation checkbox field

  // --- Selected Teeth (using the new selector) ---
  // Define the possible condition values based on the ToothCondition type for Zod validation
  // Using z.string() for keys as object keys are strings, ToothSelector handles conversion
  dh_selected_teeth: z.record(z.string(), z.object({ 
    conditions: z.array(z.enum([ // Use z.enum with the actual string values
      'healthy', 'decayed', 'filled', 'missing', 'treatment-planned', 
      'root-canal', 'extraction', 'crown', 'has-treatment-before', 
      'recommended-to-be-treated'
    ])) 
  })).optional().default({}), // Default to empty object

  // --- Fields removed or moved ---
  // last_dental_visit_date: z.date().optional().nullable(), // Replaced by dh_treatment_dates
  // additional_hygiene_products_other: z.string().optional(), // Merged into dh_additional_hygiene_products
  // uses_tobacco / tobacco_details / consumes_alcohol / alcohol_frequency -> Moved to Lifestyle form
});

export type DentalHistoryValues = z.infer<typeof dentalHistorySchema>;

// Define props for the form component (ref removed)
interface PatientDentalHistoryFormProps {
  // No props needed specific to this form section anymore, unless others are added later
}

// --- Past Dental Treatment Options ---
const pastTreatmentOptions = [
  { id: 'regular_cleanings', label: 'Regular Dental Cleanings (Scaling & Polishing)' },
  { id: 'deep_cleaning', label: 'Deep Cleaning (Full Mouth Debridement or SRP)' },
  { id: 'fillings', label: 'Fillings', subOptions: [
    { id: 'fillings_composite', label: 'Composite (White)' },
    { id: 'fillings_amalgam', label: 'Amalgam (Silver)' },
  ]},
  { id: 'extractions', label: 'Tooth Extractions', subOptions: [
    { id: 'extraction_simple', label: 'Simple Extraction' },
    { id: 'extraction_surgical', label: 'Surgical Extraction' },
  ]},
  { id: 'crowns', label: 'Crowns (Caps)', subOptions: [
    { id: 'crown_porcelain', label: 'Porcelain' },
    { id: 'crown_metal', label: 'Metal' },
    { id: 'crown_zirconia', label: 'Zirconia' },
  ]},
  { id: 'bridges', label: 'Bridges' },
  { id: 'rct', label: 'Root Canal Treatment (RCT)', subOptions: [
    { id: 'rct_anterior', label: 'Anterior Teeth' },
    { id: 'rct_posterior', label: 'Posterior Teeth' },
  ]},
  { id: 'implants', label: 'Dental Implants', subOptions: [
    { id: 'implant_single', label: 'Single Implant' },
    { id: 'implant_multiple', label: 'Multiple Implants' },
  ]},
  { id: 'dentures', label: 'Dentures', subOptions: [
    { id: 'denture_full', label: 'Full Dentures' },
    { id: 'denture_partial', label: 'Partial Dentures' },
  ]},
  { id: 'veneers', label: 'Veneers' },
  { id: 'whitening', label: 'Teeth Whitening' },
  { id: 'orthodontics', label: 'Orthodontic Treatment', subOptions: [
    { id: 'ortho_braces', label: 'Braces (Metal or Ceramic)' },
    { id: 'ortho_aligners', label: 'Clear Aligners (e.g., Invisalign)' },
  ]},
  { id: 'gum_treatments', label: 'Gum Treatments', subOptions: [
    { id: 'gum_surgery', label: 'Gum Surgery' },
    { id: 'gum_laser', label: 'Laser Gum Therapy' },
  ]},
  { id: 'jaw_treatment', label: 'Jaw Treatment', subOptions: [
    { id: 'jaw_tmj', label: 'TMJ/TMD Therapy' },
    { id: 'jaw_bite_adjustment', label: 'Bite Adjustment / Occlusal Correction' },
  ]},
  { id: 'guards', label: 'Night Guards or Mouthguards' },
  { id: 'other_treatment', label: 'Other (please specify)' },
];


export function PatientDentalHistoryForm({}: PatientDentalHistoryFormProps) { // Removed dentalChartRef prop
  const form = useFormContext<DentalHistoryValues>(); // Get form context

  return (
    <div className="space-y-8">
      {/* Section Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dental History</h2>
        <p className="text-sm text-muted-foreground">
          Please provide your detailed dental history.
        </p>
      </div>

      {/* --- Reason for Visit & Chief Complaint --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Reason for Visit & Chief Complaint</h4>
        <FormField
          control={form.control}
          name="dh_reason_for_visit"
          render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_reason_for_visit'> }) => ( // Add explicit type for field
            <FormItem>
              <FormLabel>Primary Reason for Visit</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="routine_checkup">Routine Checkup</SelectItem>
                  <SelectItem value="tooth_pain">Tooth Pain</SelectItem>
                  <SelectItem value="gum_issues">Gum Issues</SelectItem>
                  <SelectItem value="sensitivity">Sensitivity</SelectItem>
                  <SelectItem value="cosmetic_concerns">Cosmetic Concerns</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('dh_reason_for_visit') === 'other' && (
          <FormField
            control={form.control}
            name="dh_reason_for_visit_other"
            render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_reason_for_visit_other'> }) => ( // Add explicit type for field
              <FormItem>
                <FormLabel>If Other, please describe:</FormLabel>
                <FormControl><Input placeholder="Explain reason" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
         <FormField
           control={form.control}
           name="dh_chief_complaint"
           render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_chief_complaint'> }) => ( // Add explicit type for field
             <FormItem>
               <FormLabel>Chief Complaint Description</FormLabel>
               <FormDescription>Please provide a detailed description of the issue that brought you here. Include when the problem began, how it has progressed, and any pain or discomfort experienced.</FormDescription>
               <FormControl><Textarea rows={4} placeholder="Describe your main concern..." {...field} /></FormControl>
               <FormMessage />
             </FormItem>
           )}
         />
      </div>

      {/* --- Pain & Sensitivity Details --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Pain & Sensitivity Details</h4>
        <FormField
          control={form.control}
          name="dh_has_pain"
          render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_has_pain'> }) => ( // Add explicit type for field
            <FormItem className="space-y-3">
              <FormLabel>Do you experience any dental pain or sensitivity?</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('dh_has_pain') === 'yes' && (
          <>
            <FormField
              control={form.control}
              name="dh_pain_description"
              render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_pain_description'> }) => ( // Add explicit type for field
                <FormItem>
                  <FormLabel>Pain Description</FormLabel>
                  <FormDescription>Specify location(s), intensity, frequency, and triggers (temperature, chewing, stress).</FormDescription>
                  <FormControl><Textarea rows={3} placeholder="e.g., Upper left molar, sharp pain (7/10) when chewing cold items, intermittent." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dh_pain_scale"
              render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_pain_scale'> }) => ( // Add explicit type for field
                <FormItem>
                  <FormLabel>Pain Scale (1=Mild, 10=Severe)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select pain level" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => (<SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
               control={form.control}
               name="dh_pain_duration_onset"
               render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_pain_duration_onset'> }) => ( // Add explicit type for field
                 <FormItem>
                   <FormLabel>Duration & Onset</FormLabel>
                   <FormDescription>When did you first notice the pain/sensitivity? Is it constant or intermittent?</FormDescription>
                   <FormControl><Input placeholder="e.g., Started 2 weeks ago, comes and goes" {...field} /></FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
          </>
        )}
      </div>

      {/* --- Previous Dental Treatments & Procedures (Checkboxes) --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Previous Dental Treatments & Procedures</h4>
        <FormField
          control={form.control}
          name="dh_past_treatments"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Past Treatments</FormLabel>
                <FormDescription>Please select or describe all that apply.</FormDescription>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4"> {/* Use grid for horizontal layout, adjusted gap */}
                {pastTreatmentOptions.map((item) => (
                  <div key={item.id}> {/* Removed flex container, let grid handle item layout */}
                    <FormField
                      control={form.control}
                      name="dh_past_treatments"
                      render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_past_treatments'> }) => ( // Add explicit type for field
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked: boolean | 'indeterminate') => {
                                return checked === true
                                  ? field.onChange([...(field.value || []), item.id])
                                  : field.onChange((field.value || []).filter((value: string) => value !== item.id)); // Add type for 'value'
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">{item.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                    {/* Conditionally render Sub-options only if parent is checked */}
                    {item.subOptions && form.watch('dh_past_treatments')?.includes(item.id) && (
                      <div className="ml-6 mt-1 space-y-1"> {/* Indent sub-options, reduced spacing */}
                        {item.subOptions.map((subItem) => (
                           <FormField
                             key={subItem.id}
                             control={form.control}
                             name="dh_past_treatments" // Still part of the same array
                             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_past_treatments'> }) => ( // Add explicit type for field
                               <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                 <FormControl>
                                   <Checkbox
                                     checked={field.value?.includes(subItem.id)}
                                     onCheckedChange={(checked: boolean | 'indeterminate') => {
                                       // Also check/uncheck parent if needed (optional, depends on desired UX)
                                       const newValue = checked === true
                                         ? [...(field.value || []), subItem.id]
                                         : (field.value || []).filter((value: string) => value !== subItem.id); // Add type for 'value'
                                       // Optional: Add parent if a child is checked
                                       // if (checked === true && !newValue.includes(item.id)) {
                                       //   newValue.push(item.id);
                                       // }
                                       field.onChange(newValue);
                                     }}
                                   />
                                 </FormControl>
                                 <FormLabel className="text-sm font-normal">{subItem.label}</FormLabel>
                               </FormItem>
                             )}
                           />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Conditional Input for "Other" */}
        {form.watch('dh_past_treatments')?.includes('other_treatment') && (
          <FormField
            control={form.control}
            name="dh_past_treatments_other"
            render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_past_treatments_other'> }) => ( // Add explicit type for field
              <FormItem className="mt-4"> {/* Add margin top */}
                <FormLabel>Specify Other Treatments:</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe other treatments..."
                    {...field}
                    value={field.value || ''} // Handle null/undefined
                />
              </FormControl>
              {/* <FormMessage /> - Removed as ToothSelector displays selection */}
            </FormItem>
          )}
          />
        )}
      </div>

      {/* --- Affected Teeth Section (Using ToothSelector) --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Affected Teeth & Conditions</h4>
        <FormDescription>
          Click the button to select the teeth involved. The specific conditions for these teeth can be detailed in the treatment plan later.
        </FormDescription>
        <FormField
          control={form.control}
          name="dh_selected_teeth" // Use the new schema field
          // Update field type to ToothConditionsMap
          render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_selected_teeth'> }) => {
            return (
            <FormItem>
              <FormLabel>Affected Teeth</FormLabel>
              <FormControl>
                {/* Render the ToothSelector component */}
                  <ToothSelector
                    // Ensure value passed is an object (ToothConditionsMap), default to empty object
                    value={field.value || {}}
                    onChange={field.onChange} // Pass the onChange handler (expects ToothConditionsMap)
                    placeholder="Select Affected Teeth..."
                    // disabled={field.disabled} // Pass disabled state if needed
                  />
              </FormControl>
              <FormMessage />
            </FormItem>
            );
          }}
        />
      </div>

      {/* --- Oral Hygiene Routine & Home Care --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Oral Hygiene Routine & Home Care</h4>
           <FormField
             control={form.control}
             name="dh_brushing_frequency"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_brushing_frequency'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Brushing Frequency</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value}>
                   <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                   <SelectContent>
                     <SelectItem value="less_than_once">Less than once a day</SelectItem>
                     <SelectItem value="once_a_day">Once a day</SelectItem>
                     <SelectItem value="twice_a_day">Twice a day</SelectItem>
                     <SelectItem value="more_than_twice">More than twice a day</SelectItem>
                   </SelectContent>
                 </Select>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="dh_flossing_habits"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_flossing_habits'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Flossing Habits</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value}>
                   <FormControl><SelectTrigger><SelectValue placeholder="Select habit" /></SelectTrigger></FormControl>
                   <SelectContent>
                     <SelectItem value="yes_daily">Yes, daily</SelectItem>
                     <SelectItem value="occasionally">Occasionally</SelectItem>
                     <SelectItem value="no">No</SelectItem>
                   </SelectContent>
                 </Select>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="dh_additional_hygiene_products"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_additional_hygiene_products'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Additional Oral Hygiene Products</FormLabel>
                 <FormDescription>List products used besides brushing/flossing (mouthwash, water flosser, etc.).</FormDescription>
                 <FormControl><Input placeholder="e.g., Listerine mouthwash, Waterpik" {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="dh_technique_tools"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_technique_tools'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Technique & Tools</FormLabel>
                 <FormDescription>Describe your brushing technique and any special tools (e.g., electric toothbrush).</FormDescription>
                 <FormControl><Input placeholder="e.g., Soft bristle brush, circular motions, Sonicare toothbrush" {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
       </div>

      {/* --- History of Orthodontic Treatment --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">History of Orthodontic Treatment</h4>
           <FormField
             control={form.control}
             name="dh_orthodontic_history"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_orthodontic_history'> }) => ( // Add explicit type for field
               <FormItem className="space-y-3">
                 <FormLabel>Have you had braces, clear aligners, or other orthodontic treatments?</FormLabel>
                 <FormControl>
                   <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                   </RadioGroup>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {form.watch('dh_orthodontic_history') === 'yes' && (
             <FormField
               control={form.control}
               name="dh_orthodontic_details"
               render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_orthodontic_details'> }) => ( // Add explicit type for field
                 <FormItem>
                   <FormLabel>If yes, specify type, duration, outcomes, challenges:</FormLabel>
                   <FormControl><Textarea rows={3} placeholder="e.g., Traditional braces (2 years), results good, wore retainer." {...field} /></FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           )}
       </div>

      {/* --- Dental Records & X-Rays --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Dental Records & X-Rays</h4>
           <FormField
             control={form.control}
             name="dh_has_records"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_has_records'> }) => ( // Add explicit type for field
               <FormItem className="space-y-3">
                 <FormLabel>Do you have copies of previous dental records or X-rays available?</FormLabel>
                 <FormControl>
                   <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                   </RadioGroup>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="dh_xray_frequency"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_xray_frequency'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>X-Ray Frequency</FormLabel>
                 <FormDescription>How often have you had dental X-rays? (Approximate dates if known).</FormDescription>
                 <FormControl><Input placeholder="e.g., Yearly bitewings, Full mouth series (2020)" {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
       </div>

      {/* --- Occlusal & Bite Concerns --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Occlusal & Bite Concerns</h4>
           <FormField
             control={form.control}
             name="dh_bite_issues"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_bite_issues'> }) => ( // Add explicit type for field
               <FormItem className="space-y-3">
                 <FormLabel>Do you have issues with your bite or TMJ pain?</FormLabel>
                 <FormControl>
                   <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                   </RadioGroup>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {form.watch('dh_bite_issues') === 'yes' && (
             <FormField
               control={form.control}
               name="dh_bite_symptoms"
               render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_bite_symptoms'> }) => ( // Add explicit type for field
                 <FormItem>
                   <FormLabel>If yes, describe symptoms (jaw pain, clicking, difficulty chewing):</FormLabel>
                   <FormControl><Textarea rows={3} placeholder="e.g., Jaw clicks when opening wide, occasional pain on left side" {...field} /></FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           )}
       </div>

      {/* --- Aesthetic & Functional Concerns --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Aesthetic & Functional Concerns</h4>
           <FormField
             control={form.control}
             name="dh_cosmetic_concerns"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_cosmetic_concerns'> }) => ( // Add explicit type for field
               <FormItem className="space-y-3">
                 <FormLabel>Are you concerned about the appearance of your teeth?</FormLabel>
                 <FormControl>
                   <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                   </RadioGroup>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {form.watch('dh_cosmetic_concerns') === 'yes' && (
             <FormField
               control={form.control}
               name="dh_cosmetic_issues_details"
               render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_cosmetic_issues_details'> }) => ( // Add explicit type for field
                 <FormItem>
                   <FormLabel>Specify concerns (color, shape, alignment, spacing):</FormLabel>
                   <FormControl><Textarea rows={3} placeholder="e.g., Teeth are slightly yellow, gap between front teeth" {...field} /></FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           )}
            <FormField
             control={form.control}
             name="dh_functional_concerns"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_functional_concerns'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Functional Concerns</FormLabel>
                 <FormDescription>Describe difficulties with eating, speaking, etc.</FormDescription>
                 <FormControl><Textarea rows={3} placeholder="e.g., Difficulty chewing hard foods on the right side" {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
       </div>

      {/* --- Previous Dental Emergencies & Urgent Care --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Previous Dental Emergencies & Urgent Care</h4>
           <FormField
             control={form.control}
             name="dh_emergency_history"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_emergency_history'> }) => ( // Add explicit type for field
               <FormItem className="space-y-3">
                 <FormLabel>Have you experienced any dental emergencies?</FormLabel>
                 <FormControl>
                   <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                   </RadioGroup>
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           {form.watch('dh_emergency_history') === 'yes' && (
             <FormField
               control={form.control}
               name="dh_emergency_details"
               render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_emergency_details'> }) => ( // Add explicit type for field
                 <FormItem>
                   <FormLabel>If yes, provide details (when, how managed):</FormLabel>
                   <FormControl><Textarea rows={3} placeholder="e.g., Broken tooth (2022), fixed with a crown" {...field} /></FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           )}
       </div>

      {/* --- Additional Comments & Future Dental Goals --- */}
      <div className="space-y-4 p-4 border rounded-md">
          <h4 className="font-medium">Additional Comments & Future Dental Goals</h4>
           <FormField
             control={form.control}
             name="dh_additional_summary"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_additional_summary'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Overall Dental History Summary</FormLabel>
                 <FormDescription>Any additional information not covered above.</FormDescription>
                 <FormControl><Textarea rows={4} placeholder="Additional notes..." {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
           <FormField
             control={form.control}
             name="dh_future_goals"
             render={({ field }: { field: ControllerRenderProps<DentalHistoryValues, 'dh_future_goals'> }) => ( // Add explicit type for field
               <FormItem>
                 <FormLabel>Future Treatment Goals & Expectations</FormLabel>
                 <FormDescription>What outcomes are you hoping for?</FormDescription>
                 <FormControl><Textarea rows={4} placeholder="e.g., Whiter teeth, replace missing tooth" {...field} /></FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
       </div>

      {/* Removed Confirmation Checkbox FormField */}

    </div>
  );
}
