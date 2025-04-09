import { z } from "zod";
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Define the schema for family history
export const familyHistorySchema = z.object({
  // Family Medical History
  family_medical_conditions: z.array(z.string()).optional(),
  family_medical_conditions_other: z.string().optional(),
  // Family Dental History
  family_dental_issues: z.array(z.string()).optional(),
  family_dental_issues_other: z.string().optional(),
});

export type FamilyHistoryValues = z.infer<typeof familyHistorySchema>;

const commonFamilyMedicalConditions = [
  { id: 'family_heart_disease', label: 'Heart Disease' },
  { id: 'family_diabetes', label: 'Diabetes' },
  { id: 'family_high_cholesterol', label: 'High Cholesterol' },
  { id: 'family_hypertension', label: 'Hypertension' },
  { id: 'family_cancer', label: 'Cancer' },
  { id: 'family_osteoporosis', label: 'Osteoporosis' },
];

const commonFamilyDentalIssues = [
  { id: 'family_gum_disease', label: 'Gum Disease' },
  { id: 'family_tooth_loss', label: 'Tooth Loss' },
  { id: 'family_orthodontic_issues', label: 'Orthodontic Issues' },
];

export function PatientFamilyHistoryForm() {
  const form = useFormContext<FamilyHistoryValues>();

  return (
    <div className="space-y-8">
      {/* Section Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Family Medical & Dental History</h2>
        <p className="text-sm text-muted-foreground">
          Information about medical and dental conditions in your family.
        </p>
      </div>

      {/* --- Family Medical History --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Family Medical History</h4>
        <FormField
          control={form.control}
          name="family_medical_conditions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Has anyone in your family been diagnosed with the following?</FormLabel>
                <FormDescription>Select all that apply.</FormDescription>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {commonFamilyMedicalConditions.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="family_medical_conditions"
                    render={({ field }) => (
                      <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange((field.value || []).filter((value) => value !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="family_medical_conditions_other"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other family medical conditions:</FormLabel>
              <FormControl>
                <Input placeholder="Specify other conditions" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* --- Family Dental History --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Family Dental History</h4>
        <FormField
          control={form.control}
          name="family_dental_issues"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Does your family have a history of dental issues?</FormLabel>
                <FormDescription>Select all that apply.</FormDescription>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {commonFamilyDentalIssues.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="family_dental_issues"
                    render={({ field }) => (
                      <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange((field.value || []).filter((value) => value !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="family_dental_issues_other"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other family dental issues:</FormLabel>
              <FormControl>
                <Input placeholder="Specify other issues" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

    </div>
  );
}
