import { z } from "zod";
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
// Assuming a DatePicker component exists or needs to be created/imported
// import { DatePicker } from "@/components/ui/date-picker"; 

// Define the schema for consent
// Note: The main 'consent_given' checkbox might already be handled in PatientDocumentsForm.
// This form focuses on the acknowledgment statement and signature/date if needed here.
// Adjust based on where the main consent checkbox lives.
export const consentSchema = z.object({
  acknowledgment: z.boolean().refine(val => val === true, {
    message: "You must acknowledge that the information provided is accurate.",
  }),
  patient_signature_consent: z.string().optional(), // Field for typed name/signature
  consent_date: z.date().optional().default(new Date()), // Default to today
});

export type ConsentValues = z.infer<typeof consentSchema>;

export function PatientConsentForm() {
  const form = useFormContext<ConsentValues>();

  return (
    <div className="space-y-8">
      {/* Section Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Consent & Acknowledgment</h2>
        <p className="text-sm text-muted-foreground">
          Please review and acknowledge the information provided.
        </p>
      </div>

      {/* --- Acknowledgment --- */}
      <div className="space-y-4 p-4 border rounded-md">
         <FormField
            control={form.control}
            name="acknowledgment"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I confirm that the information provided is complete and accurate to the best of my knowledge.
                  </FormLabel>
                   <FormMessage />
                </div>
              </FormItem>
            )}
          />
      </div>

       {/* --- Signature & Date --- */}
       {/* These might be handled differently (e.g., digital signature pad, part of documents) */}
       {/* Including basic fields here for completeness based on request */}
       <div className="space-y-4 p-4 border rounded-md">
         <h4 className="font-medium">Signature & Date</h4>
          <FormField
            control={form.control}
            name="patient_signature_consent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Signature (Type full name):</FormLabel>
                <FormControl>
                  <Input placeholder="Type your full name" {...field} />
                </FormControl>
                 <FormDescription>
                   Typing your name here acts as your digital signature.
                 </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="consent_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                 {/* Replace with your actual DatePicker component if available */}
                 <FormControl>
                    <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} />
                 </FormControl>
                 {/* <DatePicker date={field.value} onDateChange={field.onChange} /> */}
                <FormMessage />
              </FormItem>
            )}
          />
       </div>

    </div>
  );
}
