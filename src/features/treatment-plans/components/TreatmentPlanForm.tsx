import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Form,
  FormControl,
  FormDescription, // Re-add FormDescription
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added Label import
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Re-add single Select imports
import { Loader2, Plus } from 'lucide-react'; // Ensure AlertCircle is removed
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase'; // Import supabase client
import { MultiSelectCheckbox, MultiSelectOption } from '@/components/ui/multi-select-checkbox'; // Import MultiSelectCheckbox
// Removed Alert component imports

// Define schema for treatment plan form
export const treatmentPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  patient_id: z.string().min(1, "Patient is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]),
  estimated_cost: z.string().optional().transform(val => val ? parseFloat(val) : null),
  // Removed tooth_ids from the main plan schema
});

// Define type for tooth data
interface Tooth {
  id: number;
  description: string;
}

export type TreatmentPlanFormValues = z.infer<typeof treatmentPlanSchema>;

interface TreatmentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Update onSubmit prop type to include toothIds
  onSubmit: (data: TreatmentPlanFormValues, toothIds: number[]) => Promise<void>; 
  patients: any[];
  loading?: boolean;
}


export function TreatmentPlanForm({
  open,
  onOpenChange,
  onSubmit,
  patients,
  loading = false,
}: TreatmentPlanFormProps) {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  // Assuming these might be passed as props or fetched, adding basic state for now
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null); // This line was already added, ensuring it's correct

  // Restore state for teeth selection
  const [teeth, setTeeth] = useState<Tooth[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Add state to manage selected teeth IDs separately from the form
  const [selectedToothIds, setSelectedToothIds] = useState<number[]>([]);

  const form = useForm<TreatmentPlanFormValues>({
    resolver: zodResolver(treatmentPlanSchema),
    defaultValues: {
      title: '',
      description: '',
      patient_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      status: 'planned',
      priority: 'medium',
      estimated_cost: undefined, // Use undefined for optional number
      // Removed tooth_ids default value
    },
  });

  // Restore useEffect for fetching teeth data
  useEffect(() => {
    if (open) {
      const fetchTeeth = async () => {
        setFetchError(null);
        const { data, error } = await supabase
          .from('teeth')
          .select('id, description')
          .order('id', { ascending: true });

        if (error) {
          console.error('Error fetching teeth:', error);
          setFetchError('Failed to load teeth data. Please try again.');
          setTeeth([]);
        } else {
          setTeeth(data || []);
        }
      };
      fetchTeeth();
    } else {
      // Reset state when dialog closes
      setTeeth([]);
      setFetchError(null);
    setSelectedToothIds([]); // Reset selected teeth
    setSelectedPatientId(null); // Reset selected patient ID
    setSelectedPatientName(null); // Reset selected patient name
    setSearchTerm(''); // Reset search term
    form.reset(); // Reset form when dialog closes
     }
   }, [open, form]);

  // Handler for patient selection from search results
  const handlePatientSelect = (patient: any) => {
    setSelectedPatientId(patient.id); // Update the separate state if needed
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    form.setValue('patient_id', patient.id, { shouldValidate: true }); // Update the form value
    setSearchTerm(''); // Clear search term after selection
  };

  // Handler for teeth selection change
  const handleTeethChange = (selected: (string | number)[]) => {
    const numericIds = selected.map(id => Number(id)).filter(id => !isNaN(id));
    setSelectedToothIds(numericIds);
  };
   
   // Modify handleSubmit to potentially include selectedToothIds later
   const handleSubmit = async (values: TreatmentPlanFormValues) => {
    // Pass both form values and selected tooth IDs to the onSubmit prop
    await onSubmit(values, selectedToothIds); 
    // Reset selected teeth as well
    setSelectedToothIds([]); 
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"> {/* Increased width and height */}
        <DialogHeader>
          <DialogTitle>Create New Treatment Plan</DialogTitle>
          <DialogDescription>
            Create a comprehensive treatment plan for a patient
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6">
            {/* Patient Search Input - Replaced Dropdown */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => ( // field is still needed for react-hook-form to track the value
                <FormItem className="relative"> {/* Added relative positioning */}
                  <FormLabel htmlFor="patient-search">Patient *</FormLabel>
                  <FormControl>
                    <Input
                      type="search"
                      id="patient-search"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        // Don't clear form value immediately on search, only on selection/manual clear
                        // form.setValue('patient_id', ''); // Removed this line
                        setSelectedPatientName(null); // Clear display name while searching
                      }}
                      placeholder={selectedPatientName || "Search by name, phone, or registration..."}
                      disabled={isLoadingPatients}
                      className="w-full"
                      // Keep field props for RHF connection, but control display/search separately
                      // {...field} // Remove direct spreading of field props to Input value/onChange
                    />
                  </FormControl>
                  {isLoadingPatients && <p className="text-sm text-muted-foreground mt-1">Loading patients...</p>}
                  {errorPatients && <p className="text-sm text-destructive mt-1">{errorPatients}</p>}

                  {/* Search Results Dropdown */}
                  {searchTerm && !isLoadingPatients && !errorPatients && (
                    <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60">
                      <div className="p-2">
                        {patients.filter(patient => {
                          const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                          const phone = patient.phone?.toLowerCase() || '';
                          const regNum = patient.registration_number?.toLowerCase() || '';
                          const searchLower = searchTerm.toLowerCase();
                          return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                        }).length > 0 ? (
                          patients
                            .filter(patient => {
                              const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                              const phone = patient.phone?.toLowerCase() || '';
                              const regNum = patient.registration_number?.toLowerCase() || '';
                              const searchLower = searchTerm.toLowerCase();
                              return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                            })
                            .map((patient) => (
                              <Button
                                key={patient.id}
                                variant="ghost"
                                className="w-full justify-start text-left h-auto py-2 px-3 mb-1"
                                onClick={() => handlePatientSelect(patient)}
                                type="button" // Prevent form submission
                              >
                                <div>
                                  <div>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {patient.registration_number && `Reg: ${patient.registration_number}`}
                                    {patient.registration_number && patient.phone && " | "}
                                    {patient.phone && `Ph: ${patient.phone}`}
                                  </div>
                                </div>
                              </Button>
                            ))
                        ) : (
                          <p className="text-sm text-muted-foreground p-2">No patients found matching "{searchTerm}"</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  <FormMessage /> {/* Keep FormMessage to show validation errors for patient_id */}
                </FormItem>
              )}
            />

            {/* Teeth Selection */}
            <FormItem>
              <FormLabel>Teeth</FormLabel>
              <MultiSelectCheckbox
                 options={teeth.map(t => ({ value: t.id, label: `${t.id} - ${t.description}` }))}
                 selectedValues={selectedToothIds} // Use separate state
                 onChange={handleTeethChange} // Use the defined handler function
                 placeholder="Select teeth..."
                 className="w-full"
                disabled={fetchError !== null || teeth.length === 0}
              />
              {fetchError && <FormDescription className="text-destructive">{fetchError}</FormDescription>}
              {selectedToothIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedToothIds.map(id => {
                    const tooth = teeth.find(t => t.id === id);
                    return tooth ? (
                      <span 
                        key={id}
                        className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      >
                        {tooth.id} - {tooth.description}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </FormItem>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Treatment plan title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the treatment plan" 
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                        value={field.value || ''}
                        min={form.watch('start_date')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="estimated_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Total Cost (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''} // Convert null/undefined to empty string for input
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
