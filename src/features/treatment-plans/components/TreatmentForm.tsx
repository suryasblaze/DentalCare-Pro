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
import { Loader2, Plus } from 'lucide-react';

// Define schema for treatment form
export const treatmentSchema = z.object({
  type: z.string().min(1, "Treatment type is required"),
  description: z.string().min(1, "Description is required"),
    status: z.enum(["pending", "completed", "cancelled"]),
    // Keep cost as string, only validate it's numeric. NO transform.
    cost: z.string().min(1, "Cost is required")
      .refine(val => !isNaN(parseFloat(val)), "Cost must be a valid number"), 
    // Handle optional duration: transform empty string to null
    estimated_duration: z.string().optional().transform(val => val === "" ? null : val), 
    priority: z.enum(["low", "medium", "high"]),
  plan_id: z.string().min(1)
});

export type TreatmentFormValues = z.infer<typeof treatmentSchema>;

interface TreatmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TreatmentFormValues) => Promise<void>;
  planId: string;
  loading?: boolean;
}

export function TreatmentForm({
  open,
  onOpenChange,
  onSubmit,
  planId,
  loading = false
}: TreatmentFormProps) {
  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      type: '',
      description: '',
      status: 'pending',
      cost: '',
      estimated_duration: '', // Default to empty string, will be transformed to null by schema
      priority: 'medium',
      plan_id: planId
    }
  });
  
  // Update plan_id when it changes
  React.useEffect(() => {
    if (planId) {
      form.setValue('plan_id', planId);
    }
  }, [planId, form]);
  
  const handleSubmit = async (values: TreatmentFormValues) => {
    await onSubmit(values);
    form.reset({
      type: '',
      description: '',
      status: 'pending',
      cost: '',
      estimated_duration: '',
      priority: 'medium',
      plan_id: planId
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Treatment</DialogTitle>
          <DialogDescription>
            Add a treatment procedure to the plan
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Type *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Root Canal, Filling, Crown" {...field} />
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
                      placeholder="Detailed description of the treatment" 
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              {/* Use Controller for more explicit control over cost field */}
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
                        // Pass necessary props from field, manage value/onChange explicitly
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        // Ensure value is always a string for the Input
                        value={field.value === null || field.value === undefined ? '' : String(field.value)}
                        onChange={(e) => {
                          // Pass the raw string value back to react-hook-form
                          field.onChange(e.target.value);
                        }}
                        // Add aria-invalid for accessibility based on error state
                        aria-invalid={!!error}
                      />
                    </FormControl>
                    {/* Display error message if present */}
                    {error && <FormMessage>{error.message}</FormMessage>}
                    {/* Fallback if no specific error message but field is invalid */}
                    {!error && field.value !== '' && form.formState.errors.cost && <FormMessage>{form.formState.errors.cost.message}</FormMessage>}
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
                      {/* Use nullish coalescing for value */}
                      <Input placeholder="e.g., 1 hour, 30 minutes" {...field} value={field.value ?? ''} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Treatment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
