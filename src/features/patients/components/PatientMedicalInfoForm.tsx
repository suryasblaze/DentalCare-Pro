import { z } from "zod";
import { useFormContext, useFieldArray } from 'react-hook-form'; // Import useFieldArray
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button"; // Import Button
import { X } from 'lucide-react'; // Import X icon for remove button
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// --- Allergy Options ---
const medicationAllergies = [
  { id: 'penicillin', label: 'Penicillin' },
  { id: 'amoxicillin', label: 'Amoxicillin' },
  { id: 'aspirin', label: 'Aspirin' },
  { id: 'ibuprofen', label: 'Ibuprofen' },
  { id: 'codeine', label: 'Codeine' },
  { id: 'sulfa_drugs', label: 'Sulfa Drugs' },
  { id: 'local_anesthetics', label: 'Local Anesthetics (e.g., Lidocaine)' },
  { id: 'other_medications', label: 'Other Medications (please specify)' },
];

const foodAllergies = [
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'tree_nuts', label: 'Tree Nuts (e.g., almonds, walnuts)' },
  { id: 'dairy', label: 'Dairy Products' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'soy', label: 'Soy' },
  { id: 'other_food', label: 'Other Food Allergies (please specify)' },
];

const environmentalAllergies = [
  { id: 'pollen', label: 'Pollen' },
  { id: 'dust_mites', label: 'Dust Mites' },
  { id: 'mold', label: 'Mold' },
  { id: 'pet_dander', label: 'Pet Dander' },
  { id: 'insect_stings', label: 'Insect Stings' },
  { id: 'latex', label: 'Latex' },
  { id: 'fragrances', label: 'Fragrances/Perfumes' },
  { id: 'other_environmental', label: 'Other Environmental Allergies (please specify)' },
];

const otherAllergies = [
  { id: 'nickel_metals', label: 'Nickel or Metals' },
  { id: 'chlorhexidine', label: 'Chlorhexidine (mouthwash/antiseptic)' },
  { id: 'other', label: 'Other (please describe)' },
];


// Define the schema for detailed medical info ONLY
export const medicalInfoSchema = z.object({
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  height: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Height must be a positive number").nullable().optional()
  ), // Preprocess to number or null
  weight: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().positive("Weight must be a positive number").nullable().optional()
  ), // Preprocess to number or null
  // Allergies
  has_allergies: z.enum(['yes', 'no']).optional(),
  medication_allergies: z.array(z.string()).optional(),
  other_medication_allergy_details: z.string().optional(),
  food_allergies: z.array(z.string()).optional(),
  other_food_allergy_details: z.string().optional(),
  environmental_allergies: z.array(z.string()).optional(),
  other_environmental_allergy_details: z.string().optional(),
  other_allergies: z.array(z.string()).optional(),
  other_allergy_details: z.string().optional(),
  other_allergies_manual_input: z.string().optional(), // Added for manual input
  // Medical Conditions
  diagnosed_conditions: z.array(z.string()).optional(), // For checkboxes
  other_diagnosed_condition: z.string().optional(),
  has_implants: z.enum(['yes', 'no']).optional(),
  implants_details: z.string().optional(),
  // Current Medications (Structured)
  taking_medications: z.enum(['yes', 'no']).optional(),
  current_medications: z.array(z.object({
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
  })).optional(),
  // Recent Health Changes
  recent_health_changes: z.enum(['yes', 'no']).optional(),
  health_changes_details: z.string().optional(),
  // Previous Surgeries (Structured)
  previous_surgeries: z.array(z.object({
    type: z.string().min(1, "Surgery type is required"),
    date: z.string().optional(), // Consider using a date type if needed
    notes: z.string().optional(),
  })).optional(),
  // Detailed Medical Background (Immunizations, Screenings)
  immunizations_up_to_date: z.enum(['yes', 'no', 'not_sure']).optional(),
  recent_immunizations: z.string().optional(),
  recent_medical_screenings: z.enum(['yes', 'no']).optional(),
  screenings_details: z.string().optional(),
  // Allergic Reactions to Dental Materials
  dental_material_allergies: z.enum(['yes', 'no']).optional(),
  dental_material_allergies_details: z.string().optional(),
  // Add notes field back
  notes: z.string().optional(),
});

export type MedicalInfoValues = z.infer<typeof medicalInfoSchema>;

// List of common medical conditions for checkboxes
const commonMedicalConditions = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'heart_disease', label: 'Heart Disease' },
  { id: 'hypertension', label: 'Hypertension' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'bleeding_disorders', label: 'Bleeding Disorders' },
  { id: 'kidney_liver_disease', label: 'Kidney/Liver Disease' },
  { id: 'respiratory_problems', label: 'Respiratory Problems' },
  { id: 'autoimmune_disorders', label: 'Autoimmune Disorders' },
  { id: 'osteoporosis', label: 'Osteoporosis' },
];


export function PatientMedicalInfoForm() {
  const form = useFormContext<MedicalInfoValues>(); // Ensure type safety

  // Setup field arrays
  const { fields: medicationFields, append: appendMedication, remove: removeMedication } = useFieldArray({
    control: form.control,
    name: "current_medications",
  });

  const { fields: surgeryFields, append: appendSurgery, remove: removeSurgery } = useFieldArray({
    control: form.control,
    name: "previous_surgeries",
  });


  return (
    <div className="space-y-8"> {/* Increased spacing */}
      {/* Section Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Medical Information</h2>
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
              <Select onValueChange={field.onChange} defaultValue={field.value || 'unknown'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'].map((group) => (
                    <SelectItem key={group} value={group}>{group === 'unknown' ? 'Unknown' : group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Height Field (Should be inside the grid) */}
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height (cm)</FormLabel>
              <FormControl>
                <Input
                  type="number" // Use number type input
                  placeholder="175"
                  {...field}
                  value={field.value ?? ''} // Handle null value for input display
                  onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} // Use valueAsNumber, fallback to null
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weight Field (Should be inside the grid) */}
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                 <Input
                   type="number" // Use number type input
                   placeholder="70"
                   {...field}
                   value={field.value ?? ''} // Handle null value for input display
                   onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} // Use valueAsNumber, fallback to null
                 />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div> {/* Added missing closing div */}

      {/* --- Allergies Section --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Allergies</h4>
        <FormField
          control={form.control}
          name="has_allergies"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Do you have any allergies?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="yes" />
                    </FormControl>
                    <FormLabel className="font-normal">Yes</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="no" />
                    </FormControl>
                    <FormLabel className="font-normal">No</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Detailed Allergy Checkboxes (Conditional) --- */}
        {form.watch('has_allergies') === 'yes' && (
          <div className="space-y-6 mt-4"> {/* Added mt-4 for spacing */}
            {/* Medication Allergies */}
            <FormField
              control={form.control}
              name="medication_allergies"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base font-medium">Medication Allergies</FormLabel>
                    <FormDescription>Select all that apply.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {medicationAllergies.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="medication_allergies"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
            {form.watch('medication_allergies')?.includes('other_medications') && (
              <FormField
                control={form.control}
                name="other_medication_allergy_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Other Medication Allergies:</FormLabel>
                    <FormControl><Input placeholder="Details..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Food Allergies */}
            <FormField
              control={form.control}
              name="food_allergies"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base font-medium">Food Allergies</FormLabel>
                    <FormDescription>Select all that apply.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {foodAllergies.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="food_allergies"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
             {form.watch('food_allergies')?.includes('other_food') && (
              <FormField
                control={form.control}
                name="other_food_allergy_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Other Food Allergies:</FormLabel>
                    <FormControl><Input placeholder="Details..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Environmental Allergies */}
             <FormField
              control={form.control}
              name="environmental_allergies"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base font-medium">Environmental Allergies</FormLabel>
                    <FormDescription>Select all that apply.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {environmentalAllergies.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="environmental_allergies"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
             {form.watch('environmental_allergies')?.includes('other_environmental') && (
              <FormField
                control={form.control}
                name="other_environmental_allergy_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specify Other Environmental Allergies:</FormLabel>
                    <FormControl><Input placeholder="Details..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Other Allergies */}
            <FormField
              control={form.control}
              name="other_allergies"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base font-medium">Other Allergies</FormLabel>
                    <FormDescription>Select all that apply.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {otherAllergies.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="other_allergies"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
             {form.watch('other_allergies')?.includes('other') && (
              <FormField
                control={form.control}
                name="other_allergy_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe Other Allergies:</FormLabel>
                    <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                 )}
               />
             )}

            {/* Manual Input for Other Allergies */}
            <FormField
              control={form.control}
              name="other_allergies_manual_input"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manually List Any Other Allergies:</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Specific chemical, rare reaction..."
                      {...field}
                      value={field.value || ''} // Handle null/undefined
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div> // Correctly closing the conditional div
        )} {/* Correctly closing the conditional expression */}
      </div> {/* Correctly closing the main Allergies Section div */}

      {/* --- Medical Conditions Section --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Medical Conditions</h4>
        <FormField
          control={form.control}
          name="diagnosed_conditions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Have you been diagnosed with any of the following?</FormLabel>
                <FormDescription>Select all that apply.</FormDescription>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {commonMedicalConditions.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="diagnosed_conditions"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), item.id])
                                  : field.onChange(
                                      (field.value || []).filter(
                                        (value) => value !== item.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="other_diagnosed_condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Medical Conditions (if any):</FormLabel>
              <FormControl>
                <Input placeholder="Specify other conditions" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="has_implants"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Do you have any implanted devices or prosthetics?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="yes" />
                    </FormControl>
                    <FormLabel className="font-normal">Yes</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="no" />
                    </FormControl>
                    <FormLabel className="font-normal">No</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('has_implants') === 'yes' && (
          <FormField
            control={form.control}
            name="implants_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>If yes, specify (e.g., pacemaker, joint replacement):</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Pacemaker, Hip Replacement" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* --- Current Medications Section (Structured) --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Current Medications</h4>
        <FormField
          control={form.control}
          name="taking_medications"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Are you currently taking any medications?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="yes" /></FormControl>
                    <FormLabel className="font-normal">Yes</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value="no" /></FormControl>
                    <FormLabel className="font-normal">No</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('taking_medications') === 'yes' && (
          <div className="space-y-4">
            {medicationFields.map((field, index) => (
              <div key={field.id} className="flex items-start space-x-2 p-3 border rounded-md relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-grow">
                  <FormField
                    control={form.control}
                    name={`current_medications.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Lisinopril" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`current_medications.${index}.dosage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosage</FormLabel>
                        <FormControl><Input placeholder="e.g., 10mg" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`current_medications.${index}.frequency`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl><Input placeholder="e.g., Daily" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" // Position remove button
                  onClick={() => removeMedication(index)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove Medication</span>
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendMedication({ name: '', dosage: '', frequency: '' })}
            >
              Add Medication
            </Button>
          </div>
        )}
      </div>


      {/* --- Recent Health Changes Section --- */}
      <div className="space-y-4 p-4 border rounded-md">
        <h4 className="font-medium">Recent Health Changes</h4>
        <FormField
          control={form.control}
          name="recent_health_changes"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Have you experienced any recent health changes (e.g., surgeries, hospitalizations, changes in medications)?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="yes" />
                    </FormControl>
                    <FormLabel className="font-normal">Yes</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="no" />
                    </FormControl>
                    <FormLabel className="font-normal">No</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch('recent_health_changes') === 'yes' && (
          <FormField
            control={form.control}
            name="health_changes_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>If yes, please describe and provide dates if applicable:</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Knee surgery on 2024-01-15, Started new blood pressure medication last month" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

       {/* --- Previous Surgeries Section (Structured) --- */}
       <div className="space-y-4 p-4 border rounded-md">
         <h4 className="font-medium">Previous Surgeries / Hospitalizations</h4>
         <div className="space-y-4">
           {surgeryFields.map((field, index) => (
             <div key={field.id} className="flex items-start space-x-2 p-3 border rounded-md relative">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-grow">
                 <FormField
                   control={form.control}
                   name={`previous_surgeries.${index}.type`}
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Type / Reason</FormLabel>
                       <FormControl><Input placeholder="e.g., Appendectomy" {...field} /></FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name={`previous_surgeries.${index}.date`}
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Approx. Date</FormLabel>
                       <FormControl><Input placeholder="e.g., 2010" {...field} /></FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name={`previous_surgeries.${index}.notes`}
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Notes</FormLabel>
                       <FormControl><Input placeholder="Optional notes" {...field} /></FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>
               <Button
                 type="button"
                 variant="ghost"
                 size="icon"
                 className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                 onClick={() => removeSurgery(index)}
               >
                 <X className="h-4 w-4" />
                 <span className="sr-only">Remove Surgery</span>
               </Button>
             </div>
           ))}
           <Button
             type="button"
             variant="outline"
             size="sm"
             onClick={() => appendSurgery({ type: '', date: '', notes: '' })}
           >
             Add Surgery / Hospitalization
           </Button>
         </div>
       </div>

       {/* --- Immunizations & Screenings Section --- */}
       <div className="space-y-4 p-4 border rounded-md">
         <h4 className="font-medium">Immunizations & Screenings</h4>
         <FormField
           control={form.control}
           name="immunizations_up_to_date"
           render={({ field }) => (
             <FormItem className="space-y-3">
               <FormLabel>Are your immunizations up to date?</FormLabel>
               <FormControl>
                 <RadioGroup
                   onValueChange={field.onChange}
                   value={field.value}
                   className="flex space-x-4"
                 >
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="yes" /></FormControl>
                     <FormLabel className="font-normal">Yes</FormLabel>
                   </FormItem>
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="no" /></FormControl>
                     <FormLabel className="font-normal">No</FormLabel>
                   </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="not_sure" /></FormControl>
                     <FormLabel className="font-normal">Not Sure</FormLabel>
                   </FormItem>
                 </RadioGroup>
               </FormControl>
               <FormMessage />
             </FormItem>
           )}
         />
         <FormField
           control={form.control}
           name="recent_immunizations"
           render={({ field }) => (
             <FormItem>
               <FormLabel>If applicable, list recent immunizations (e.g., tetanus, influenza, COVID-19):</FormLabel>
               <FormControl>
                 <Input placeholder="e.g., Flu shot (Oct 2024), COVID Booster (Dec 2024)" {...field} />
               </FormControl>
               <FormMessage />
             </FormItem>
           )}
         />

         <FormField
           control={form.control}
           name="recent_medical_screenings"
           render={({ field }) => (
             <FormItem className="space-y-3">
               <FormLabel>Have you had any recent medical screenings (e.g., blood work, blood pressure checks)?</FormLabel>
               <FormControl>
                 <RadioGroup
                   onValueChange={field.onChange}
                   value={field.value}
                   className="flex space-x-4"
                 >
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="yes" /></FormControl>
                     <FormLabel className="font-normal">Yes</FormLabel>
                   </FormItem>
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="no" /></FormControl>
                     <FormLabel className="font-normal">No</FormLabel>
                   </FormItem>
                 </RadioGroup>
               </FormControl>
               <FormMessage />
             </FormItem>
           )}
         />
         {form.watch('recent_medical_screenings') === 'yes' && (
           <FormField
             control={form.control}
             name="screenings_details"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>If yes, list the screenings and dates:</FormLabel>
                 <FormControl>
                   <Input placeholder="e.g., Blood work (Jan 2025), Colonoscopy (Mar 2024)" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
         )}
       </div>

       {/* --- Allergic Reactions to Dental Materials --- */}
       <div className="space-y-4 p-4 border rounded-md">
         <h4 className="font-medium">Allergic Reactions to Dental Materials</h4>
         <FormField
           control={form.control}
           name="dental_material_allergies"
           render={({ field }) => (
             <FormItem className="space-y-3">
               <FormLabel>Have you ever had an allergic reaction to dental materials (e.g., latex, metals, local anesthetics)?</FormLabel>
               <FormControl>
                 <RadioGroup
                   onValueChange={field.onChange}
                   value={field.value}
                   className="flex space-x-4"
                 >
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="yes" /></FormControl>
                     <FormLabel className="font-normal">Yes</FormLabel>
                   </FormItem>
                   <FormItem className="flex items-center space-x-2 space-y-0">
                     <FormControl><RadioGroupItem value="no" /></FormControl>
                     <FormLabel className="font-normal">No</FormLabel>
                   </FormItem>
                 </RadioGroup>
               </FormControl>
               <FormMessage />
             </FormItem>
           )}
         />
         {form.watch('dental_material_allergies') === 'yes' && (
           <FormField
             control={form.control}
             name="dental_material_allergies_details"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>If yes, please describe the reaction:</FormLabel>
                 <FormControl>
                   <Textarea placeholder="e.g., Rash from latex gloves, Swelling after local anesthetic" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
         )}
       </div>

       {/* Add Notes field back if needed */}
       <FormField
         control={form.control}
         name="notes"
         render={({ field }) => (
           <FormItem>
             <FormLabel>Additional Medical Notes</FormLabel>
             <FormControl>
               <Textarea
                 placeholder="Any other relevant medical information..."
                 {...field}
                 value={field.value || ''}
               />
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
        />

    </div>
  );
}
