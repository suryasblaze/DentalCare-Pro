import { supabase } from '@/lib/supabase';
// import { Database } from '@/lib/database.types'; // Types not available, using placeholders

// Placeholder types - replace with generated types when available
export interface Reminder {
    id: string;
    user_id: string;
    message: string;
    reminder_datetime: string; // ISO string
    recurrence_config: RecurrenceConfig | null;
    is_active: boolean;
    created_at: string; // ISO string
    updated_at: string; // ISO string
}
// user_id is required for insert due to RLS policy WITH CHECK clause
export type ReminderInsert = Omit<Reminder, 'id' | 'created_at' | 'updated_at'>;
export type ReminderUpdate = Partial<Omit<Reminder, 'id' | 'created_at' | 'user_id'>>;

export type RecurrenceConfig = {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number; // e.g., Every '2' weeks
  days?: number[]; // 0=Sun, 1=Mon... for weekly
  times_per_day?: number; // How many times a day for daily recurrence
  // TODO: Add fields for monthly/yearly specifics (e.g., day of month, specific date)
  // TODO: Add fields for end condition (end date or count)
};


// Fetch all reminders for the current user
export const getReminders = async (): Promise<Reminder[]> => {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_datetime', { ascending: true });

    if (error) {
        console.error('Error fetching reminders:', error);
        throw new Error('Failed to fetch reminders.');
    }
    // Ensure recurrence_config is parsed if stored as JSON string (though JSONB should handle it)
    return data.map(r => ({
        ...r,
        recurrence_config: typeof r.recurrence_config === 'string'
            ? JSON.parse(r.recurrence_config)
            : r.recurrence_config || { type: 'none' } // Default if null/undefined
    })) as Reminder[];
};

// Create a new reminder
export const createReminder = async (reminderData: ReminderInsert): Promise<Reminder> => {
    // Ensure user_id is not explicitly set here if relying on RLS/policy default
    // Supabase policy should handle user_id based on auth.uid()

    const { data, error } = await supabase
        .from('reminders')
        .insert(reminderData)
        .select()
        .single();

    if (error) {
        console.error('Error creating reminder:', error);
        throw new Error('Failed to create reminder.');
    }
    return data as Reminder;
};

// Update an existing reminder
export const updateReminder = async (id: string, updates: ReminderUpdate): Promise<Reminder> => {
    const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating reminder:', error);
        throw new Error('Failed to update reminder.');
    }
    return data as Reminder;
};

// Delete a reminder
export const deleteReminder = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting reminder:', error);
        throw new Error('Failed to delete reminder.');
    }
};
