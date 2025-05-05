import React, { useState, useEffect } from 'react'; // Import useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Add FormDescription
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react'; // Add Clock icon
import { createReminder, updateReminder, Reminder, ReminderInsert, ReminderUpdate, RecurrenceConfig } from '../services/reminderService'; // Import service functions and types
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { setHours, setMinutes, parse } from 'date-fns'; // Import date-fns helpers

// Define the schema for the form validation using Zod
const reminderSchema = z.object({
  message: z.string().min(1, 'Reminder message is required.'),
  reminder_date: z.date({ required_error: 'Please select a date.' }),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM).' }),
  recurrence_type: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  recurrence_interval: z.number().int().min(1).optional(), // e.g., Every '2' weeks
  recurrence_days: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sun, 1=Mon...
  times_per_day: z.number().int().min(1).optional(), // How many times a day for daily recurrence
  // TODO: Add fields/validation for monthly/yearly specifics (e.g., day of month, specific date)
  // TODO: Add fields/validation for end condition (end date or count)
}).refine(data => {
    // Require interval if type is not 'none'
    if (data.recurrence_type !== 'none' && !data.recurrence_interval) {
        return false;
    }
    // Require days if type is 'weekly'
    if (data.recurrence_type === 'weekly' && (!data.recurrence_days || data.recurrence_days.length === 0)) {
        return false;
    }
    return true;
}, {
    // Custom error messages for refinement logic
    message: "Interval is required for recurrence. Days are required for weekly recurrence.",
    path: ["recurrence_interval"], // Associate error with interval field primarily
});


type ReminderFormData = z.infer<typeof reminderSchema>;
// Define recurrence type explicitly for clarity
type RecurrenceType = ReminderFormData['recurrence_type'];

interface ReminderFormProps {
  initialData?: Reminder | null;
  onSaveSuccess: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ initialData, onSaveSuccess }) => {
  const { user } = useAuth(); // Get user from auth context
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // TODO: Add state for recurrence options

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    // Default values are set in useEffect based on initialData
  });

  // Populate form when initialData changes (for editing) or reset for new
  useEffect(() => {
    if (initialData) {
      // Editing existing reminder
      const reminderDate = new Date(initialData.reminder_datetime);
      form.reset({
        message: initialData.message,
        reminder_date: reminderDate,
        reminder_time: format(reminderDate, 'HH:mm'),
        recurrence_type: initialData.recurrence_config?.type || 'none',
        recurrence_interval: initialData.recurrence_config?.interval,
        recurrence_days: initialData.recurrence_config?.days,
        times_per_day: initialData.recurrence_config?.times_per_day || 1, // Load if available, default 1
        // TODO: Set other recurrence fields
      });
    } else {
      // Creating new reminder - set defaults
      form.reset({
        message: '',
        reminder_date: undefined,
        reminder_time: '',
        recurrence_type: 'none',
        recurrence_interval: 1, // Default interval to 1
        recurrence_days: [], // Default days to empty
        times_per_day: 1, // Default times per day to 1
        // TODO: Reset other recurrence fields
      });
    }
  }, [initialData, form]);


  const onSubmit = async (data: ReminderFormData) => {
    setIsLoading(true);
    // console.log('Raw Form Data:', data); // Removed log

    // Combine date and time
    const [hours, minutes] = data.reminder_time.split(':').map(Number);
    let combinedDateTime = setMinutes(setHours(data.reminder_date, hours), minutes);

    // Ensure the date is not in the past (consider time as well)
     if (combinedDateTime < new Date()) {
         form.setError("reminder_time", { message: "Reminder time cannot be in the past." });
         // Also set error for date for visibility if needed
         form.setError("reminder_date", { message: "Reminder date/time cannot be in the past." });
         setIsLoading(false);
         return;
     }

    // Construct recurrence_config based on form data
    const recurrenceConfig: RecurrenceConfig = {
        type: data.recurrence_type,
        interval: data.recurrence_type !== 'none' ? data.recurrence_interval : undefined,
        days: data.recurrence_type === 'weekly' ? data.recurrence_days : undefined,
        times_per_day: data.recurrence_type === 'daily' ? data.times_per_day : undefined, // Add times_per_day
        // TODO: Add end date/count based on form fields
    };
    // Clean up undefined properties
    Object.keys(recurrenceConfig).forEach(key => recurrenceConfig[key as keyof RecurrenceConfig] === undefined && delete recurrenceConfig[key as keyof RecurrenceConfig]);


    // Define payloads within the scope they are needed
    let finalUpdatePayload: ReminderUpdate | null = null;
    let finalCreatePayload: ReminderInsert | null = null;

    if (initialData?.id) {
        // Payload for update
        finalUpdatePayload = {
            message: data.message,
            reminder_datetime: combinedDateTime.toISOString(),
            recurrence_config: recurrenceConfig,
            // is_active is not modified by this form yet, handled by toggle button in list
        };
        // console.log('Update Payload:', finalUpdatePayload); // Removed log
    } else {
        // Payload for create
        // Payload for create - include user_id
        if (!user) {
             toast({ title: "Error", description: "You must be logged in to create a reminder.", variant: "destructive" });
             setIsLoading(false);
             return;
        }
        finalCreatePayload = {
            user_id: user.id, // Add user_id
            message: data.message,
            reminder_datetime: combinedDateTime.toISOString(),
            recurrence_config: recurrenceConfig,
            is_active: true, // Default for new reminders
        };
        // console.log('Create Payload:', finalCreatePayload); // Removed log
    }

    // Removed duplicate createPayload declaration

    try {
      if (initialData?.id && finalUpdatePayload) {
        // Update existing reminder
        await updateReminder(initialData.id, finalUpdatePayload);
        toast({ title: "Success", description: "Reminder updated successfully." });
        // Removed desktop notification logic from form submission
      } else if (finalCreatePayload) {
        // Create new reminder
        await createReminder(finalCreatePayload);
        toast({ title: "Success", description: "Reminder created successfully." });
        // Removed desktop notification logic from form submission
      } else {
         // Should not happen if logic is correct, but good to handle
         throw new Error("Invalid state for saving reminder.");
      }
      onSaveSuccess(); // Notify parent page (triggers list refresh and clears form/editing state)
    } catch (error: any) {
      console.error('Failed to save reminder:', error);
      toast({
        title: "Error",
        description: error.message || "Could not save reminder.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reminder Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter reminder details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-4">
            <FormField
              control={form.control}
              name="reminder_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[240px] pl-3 text-left font-normal", // Adjusted width
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Disable past dates
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
              name="reminder_time"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Time (HH:MM)</FormLabel>
                   <div className="relative">
                      <FormControl>
                         <Input
                           type="time" // Use native time input for now
                           className="w-full sm:w-[120px] pl-3" // Adjusted width
                           {...field}
                         />
                      </FormControl>
                      {/* Basic clock icon */}
                      {/* <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> */}
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {/* --- Recurrence Configuration Section --- */}
        <FormField
          control={form.control}
          name="recurrence_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurrence</FormLabel>
              {/* Ensure value is always controlled, remove defaultValue */}
              <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional Recurrence Details */}
        {form.watch('recurrence_type') !== 'none' && (
          <div className="p-4 border rounded-md bg-muted/40 space-y-4 mt-2">
            {/* Interval Input */}
            <FormField
              control={form.control}
              name="recurrence_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat Every</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                       <Input
                         type="number"
                         min="1"
                         className="w-20"
                         {...field}
                         value={field.value ?? 1} // Handle potential undefined value
                         onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)} // Ensure number and default to 1 if invalid
                       />
                    </FormControl>
                    <span>
                      {form.watch('recurrence_type') === 'daily' && 'Day(s)'}
                      {form.watch('recurrence_type') === 'weekly' && 'Week(s)'}
                      {form.watch('recurrence_type') === 'monthly' && 'Month(s)'}
                      {form.watch('recurrence_type') === 'yearly' && 'Year(s)'}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Times Per Day Input (Only for Daily) */}
            {form.watch('recurrence_type') === 'daily' && (
               <FormField
                 control={form.control}
                 name="times_per_day"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Times Per Day</FormLabel>
                     <div className="flex items-center gap-2">
                       <FormControl>
                         <Input
                           type="number"
                           min="1"
                           max="24" // Reasonable max
                           className="w-20"
                           {...field}
                           value={field.value ?? 1}
                           onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                         />
                       </FormControl>
                        <span>time(s)</span>
                     </div>
                     <FormDescription className="text-xs">
                       How many times the reminder should trigger each day.
                     </FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}

            {/* Weekly Day Selection */}
            {form.watch('recurrence_type') === 'weekly' && (
              <FormField
                control={form.control}
                name="recurrence_days"
                render={() => (
                  <FormItem>
                    <FormLabel>Repeat On</FormLabel>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="recurrence_days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={index}
                                className="flex flex-row items-start space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(index)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), index])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== index
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day}
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
            )}

            {/* TODO: Add inputs for Monthly/Yearly specifics */}
            {/* TODO: Add inputs for End Condition (Date or Count) */}
             <p className="text-xs text-muted-foreground">Monthly/Yearly options and End Date/Count coming soon.</p>

          </div>
        )}
        {/* --- End Recurrence --- */}


        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (initialData ? 'Update Reminder' : 'Create Reminder')}
        </Button>
         {initialData && (
             <Button type="button" variant="outline" onClick={() => onSaveSuccess()} className="ml-2">
                 Cancel Edit
             </Button>
         )}
      </form>
    </Form>
  );
};

export default ReminderForm;
