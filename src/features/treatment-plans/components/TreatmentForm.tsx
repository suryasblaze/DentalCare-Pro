import React from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
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
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, CalendarDays } from 'lucide-react';
import { type TreatmentVisit } from './TreatmentPlanDetails'; // Import TreatmentVisit for initialData
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // For Date Picker
import { Calendar } from "@/components/ui/calendar"; // For Date Picker
import { format, parseISO } from 'date-fns'; // For date formatting

// Define schema for treatment form
export const treatmentSchema = z.object({
  type: z.string().min(1, "Treatment type is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "completed", "cancelled"]),
  cost: z.string().min(1, "Cost is required")
    .refine(val => !isNaN(parseFloat(val)), "Cost must be a valid number")
    .refine(val => parseFloat(val) >= 0, "Cost must be a non-negative number"), // Ensure cost is not negative
  estimated_duration: z.string().optional().nullable().transform(val => val === "" ? null : val),
  priority: z.enum(["low", "medium", "high"]),
  plan_id: z.string().min(1),
  // New fields for editing
  scheduled_date: z.string().optional().nullable().transform(val => val === "" ? null : val), // Store as YYYY-MM-DD string
  time_gap: z.string().optional().nullable().transform(val => val === "" ? null : val), // e.g., "7 days", "2 weeks"
});

export type TreatmentFormValues = z.infer<typeof treatmentSchema>;

interface TreatmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TreatmentFormValues) => Promise<void>;
  planId: string;
  loading?: boolean;
  initialData?: TreatmentVisit | null; // For pre-filling the form in edit mode
  isEditMode?: boolean; // To differentiate between add and edit mode
}

export function TreatmentForm({
  open,
  onOpenChange,
  onSubmit,
  planId,
  loading = false,
  initialData,
  isEditMode = false
}: TreatmentFormProps) {
  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      type: '',
      description: '',
      status: 'pending',
      cost: '0', // Default cost to '0'
      estimated_duration: '',
      priority: 'medium',
      plan_id: planId,
      scheduled_date: null,
      time_gap: null,
    }
  });
  
  React.useEffect(() => {
    if (planId && !isEditMode) { // Only set plan_id if not in edit mode from defaultValues
      form.setValue('plan_id', planId);
    }
    if (isEditMode && initialData) {
      const currentPriority = initialData.priority;
      const validPriorities = ["low", "medium", "high"];
      const priorityToSet = validPriorities.includes(currentPriority || '') 
        ? currentPriority as "low" | "medium" | "high" 
        : 'medium';

      form.reset({
        type: initialData.type || '',
        description: initialData.procedures || initialData.description || '', // procedures from Visit, description from form
        status: initialData.status || 'pending',
        cost: initialData.cost !== undefined && initialData.cost !== null ? String(initialData.cost) : '0',
        estimated_duration: initialData.estimated_duration || null,
        priority: priorityToSet,
        plan_id: initialData.treatment_plan_id || planId,
        scheduled_date: initialData.scheduled_date ? format(parseISO(initialData.scheduled_date), 'yyyy-MM-dd') : null,
        time_gap: initialData.time_gap || null,
      });
    } else if (!isEditMode) {
      // Reset to default for add mode, ensuring planId is correctly set
      form.reset({
        type: '',
        description: '',
        status: 'pending',
        cost: '0',
        estimated_duration: null,
        priority: 'medium',
        plan_id: planId,
        scheduled_date: null,
        time_gap: null,
      });
    }
  }, [planId, initialData, isEditMode, form]);
  
  const handleSubmit = async (values: TreatmentFormValues) => {
    // Ensure cost is a string representation of a number for the API if needed,
    // or convert to number if your API expects that.
    // The schema keeps it as string, which is often fine for backend conversion.
    await onSubmit(values);
    if (!isEditMode) { // Only reset fully if not in edit mode
      form.reset({
        type: '',
        description: '',
        status: 'pending',
        cost: '0',
        estimated_duration: null,
        priority: 'medium',
        plan_id: planId,
        scheduled_date: null,
        time_gap: null,
      });
    }
    // onOpenChange(false); // Optionally close dialog on successful submit
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        // When closing, reset to default add mode if it wasn't an edit cancellation
        if (!isEditMode) {
           form.reset({
            type: '', description: '', status: 'pending', cost: '0',
            estimated_duration: null, priority: 'medium', plan_id: planId,
            scheduled_date: null, time_gap: null,
          });
        }
        // For edit mode, the parent component handles clearing `initialData` if dialog is cancelled
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]"> {/* Increased width & scroll */}
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Treatment Details' : 'Add New Treatment'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details of this treatment or visit.' : 'Add a treatment procedure to the plan.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2 pr-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Type / Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Root Canal, Filling, Visit 1" {...field} />
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
                  <FormLabel>Description / Procedures *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the treatment or procedures" 
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="cost"
                control={form.control}
                render={({ field, fieldState: { error } }) => (
                  <FormItem>
                    <FormLabel>Cost (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        value={field.value === null || field.value === undefined ? '' : String(field.value)}
                        onChange={(e) => field.onChange(e.target.value)}
                        aria-invalid={!!error}
                      />
                    </FormControl>
                    {error && <FormMessage>{error.message}</FormMessage>}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimated_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="e.g., 30 minutes, 1 hour" 
                        {...field} 
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(parseISO(field.value), "PPP") // Display format
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)} // Store as YYYY-MM-DD
                          disabled={(date) => date < new Date("1900-01-01")} // Optional: disable past dates
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_gap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Visit In (Time Gap)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 7 days, 2 weeks" 
                        {...field} 
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'pending'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value || 'medium'}>
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
            
            <DialogFooter className="pt-4"> {/* Added padding top */}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || form.formState.isSubmitting}>
                {loading || form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isEditMode ? null : <Plus className="mr-2 h-4 w-4" /> // Only show Plus icon for Add mode
                )}
                {isEditMode ? 'Save Changes' : 'Add Treatment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
