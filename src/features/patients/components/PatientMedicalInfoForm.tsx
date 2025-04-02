// Removed unused React import
import { z } from "zod";
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Define the schema for medical info - Expecting strings for text areas
export const medicalInfoSchema = z.object({
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  height: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  current_medications: z.string().optional(), // Expect string
  notes: z.string().optional()
});

export type MedicalInfoValues = z.infer<typeof medicalInfoSchema>;

export function PatientMedicalInfoForm() {
  const form = useFormContext();

  // Helper to ensure value passed to Textarea is a string
  const ensureStringValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || ''; // Return empty string for null/undefined
  };


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Medical Information</h3>
        <p className="text-sm text-muted-foreground">
          Provide relevant medical information for the patient.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blood Group, Height, Weight fields remain the same */}
         <FormField
          control={form.control}
          name="blood_group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Group</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'unknown'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height (cm)</FormLabel>
              <FormControl>
                <Input
                  placeholder="175"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                 <Input
                   placeholder="70"
                   {...field}
                   value={field.value ?? ''}
                   onChange={e => field.onChange(e.target.value)}
                 />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="allergies"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Allergies</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter allergies, separated by commas (e.g., Penicillin, Peanuts)"
                {...field}
                value={ensureStringValue(field.value)} // Use helper
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="medical_conditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Medical Conditions</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter medical conditions, separated by commas (e.g., Diabetes, Hypertension)"
                {...field}
                value={ensureStringValue(field.value)} // Use helper
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="current_medications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current Medications</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter current medications, dosages, and frequency"
                {...field}
                value={ensureStringValue(field.value)} // Use helper
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any additional information relevant to patient care"
                {...field}
                value={field.value || ''} // Ensure string for notes too
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
