import { z } from "zod";
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

    // Define the schema for lifestyle and special considerations
    export const lifestyleSchema = z.object({
      // Diet and Nutrition
        diet_description: z.string().optional().nullable(), // Allow null
        // Exercise & Stress Levels
        exercise_frequency: z.preprocess(
          (val) => (typeof val === 'string' || val === null || val === undefined ? val : undefined), // Coerce unexpected types to undefined
          z.enum(['never', 'occasionally', '1-2_per_week', '3-4_per_week', 'daily']).optional().nullable()
        ),
        stress_level: z.enum(['low', 'moderate', 'high']).optional().nullable(), // Allow null
        // Sleep Patterns
       has_sleep_issues: z.enum(['yes', 'no']).optional().nullable(), // Allow null
       sleep_issues_details: z.string().optional().nullable(), // Allow null
       // Pregnancy and/or Lactation
       pregnancy_status: z.enum(['yes', 'no', 'not_applicable']).optional().nullable(), // Allow null
       pregnancy_comments: z.string().optional().nullable(), // Allow null
       // Mental Health
       has_mental_health_conditions: z.enum(['yes', 'no']).optional().nullable(), // Allow null
       mental_health_details: z.string().optional().nullable(), // Allow null
       // Additional Concerns and Comments (Moved here from original request structure)
      additional_concerns: z.string().optional().nullable(), // Allow null
      additional_comments: z.string().optional().nullable(), // Allow null
    });

export type LifestyleValues = z.infer<typeof lifestyleSchema>;

export function PatientLifestyleForm() {
  const form = useFormContext<LifestyleValues>();

  return (
    <div className="space-y-8">
      {/* Section Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Lifestyle & Special Considerations</h2>
        <p className="text-sm text-muted-foreground">
          Information about your lifestyle that may be relevant to your health.
        </p>
      </div>

      {/* --- Diet and Nutrition --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Diet and Nutrition</h4>
        <FormField
          control={form.control}
          name="diet_description"
          render={({ field }) => (
            <FormItem>
                 <FormLabel>Describe your typical diet (include details on sugar consumption, acidic foods, etc.):</FormLabel>
                 <FormControl>
                   <Textarea placeholder="e.g., Balanced diet, occasional sugary snacks, drink coffee daily..." {...field} value={field.value ?? ''} />
                 </FormControl>
                 <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* --- Exercise & Stress Levels --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Exercise & Stress Levels</h4>
        <FormField
          control={form.control}
          name="exercise_frequency"
          render={({ field }) => (
            <FormItem>
             <FormLabel>How often do you exercise?</FormLabel>
             {/* Explicitly handle potential boolean value before passing to Select */}
             <Select
               onValueChange={field.onChange}
               value={typeof field.value === 'boolean' ? undefined : field.value ?? undefined}
             >
               <FormControl>
                 <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="occasionally">Occasionally</SelectItem>
                  <SelectItem value="1-2_per_week">1-2 times per week</SelectItem>
                  <SelectItem value="3-4_per_week">3-4 times per week</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stress_level"
          render={({ field }) => (
            <FormItem>
               <FormLabel>Rate your overall stress level:</FormLabel>
               {/* Ensure value passed to Select is not null */}
               <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                 <FormControl>
                   <SelectTrigger><SelectValue placeholder="Select stress level" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* --- Sleep Patterns --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Sleep Patterns</h4>
        <FormField
          control={form.control}
          name="has_sleep_issues"
          render={({ field }) => (
            <FormItem className="space-y-3">
               <FormLabel>Do you have any sleep-related issues?</FormLabel>
               <FormControl>
                 {/* Ensure value passed to RadioGroup is not null */}
                 <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('has_sleep_issues') === 'yes' && (
          <FormField
            control={form.control}
            name="sleep_issues_details"
            render={({ field }) => (
              <FormItem>
                   <FormLabel>If yes, specify (e.g., sleep apnea, bruxism/teeth grinding):</FormLabel>
                   <FormControl>
                     <Input placeholder="e.g., Diagnosed sleep apnea, grind teeth at night" {...field} value={field.value ?? ''} />
                   </FormControl>
                   <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* --- Pregnancy and/or Lactation --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Pregnancy and/or Lactation</h4>
        <FormField
          control={form.control}
          name="pregnancy_status"
          render={({ field }) => (
            <FormItem className="space-y-3">
               <FormLabel>Are you pregnant, planning to become pregnant, or currently breastfeeding?</FormLabel>
               <FormControl>
                 {/* Ensure value passed to RadioGroup is not null */}
                 <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="not_applicable" /></FormControl><FormLabel className="font-normal">Not Applicable</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('pregnancy_status') === 'yes' && (
           <FormField
            control={form.control}
            name="pregnancy_comments"
            render={({ field }) => (
              <FormItem>
                   <FormLabel>Additional comments (if applicable):</FormLabel>
                   <FormControl>
                     <Textarea placeholder="e.g., Due date, specific concerns..." {...field} value={field.value ?? ''} />
                   </FormControl>
                   <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

       {/* --- Mental Health --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Mental Health</h4>
        <FormField
          control={form.control}
          name="has_mental_health_conditions"
          render={({ field }) => (
            <FormItem className="space-y-3">
               <FormLabel>Do you have any mental health conditions (e.g., anxiety, depression) or medications for such conditions?</FormLabel>
               <FormControl>
                 {/* Ensure value passed to RadioGroup is not null */}
                 <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('has_mental_health_conditions') === 'yes' && (
          <FormField
            control={form.control}
            name="mental_health_details"
            render={({ field }) => (
              <FormItem>
                   <FormLabel>If yes, provide details:</FormLabel>
                   <FormControl>
                     <Textarea placeholder="e.g., Diagnosed with anxiety, taking Sertraline" {...field} value={field.value ?? ''} />
                   </FormControl>
                   <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* --- Additional Concerns and Comments --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Additional Concerns and Comments</h4>
         <FormField
            control={form.control}
            name="additional_concerns"
            render={({ field }) => (
              <FormItem>
                  <FormLabel>Please list any other issues or concerns:</FormLabel>
                  <FormControl>
                     <Textarea placeholder="Any other specific concerns you want to mention?" {...field} value={field.value ?? ''} />
                   </FormControl>
                   <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="additional_comments"
            render={({ field }) => (
              <FormItem>
                   <FormLabel>Additional comments regarding dental or general health:</FormLabel>
                   <FormControl>
                     <Textarea placeholder="General comments..." {...field} value={field.value ?? ''} />
                   </FormControl>
                   <FormMessage />
              </FormItem>
            )}
          />
      </div>

    </div>
  );
}
