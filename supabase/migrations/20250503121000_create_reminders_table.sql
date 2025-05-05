-- Create the reminders table
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    reminder_datetime TIMESTAMPTZ NOT NULL,
    recurrence_config JSONB DEFAULT '{}'::jsonb, -- Stores recurrence rules (e.g., { type: 'weekly', days: [1, 3], interval: 1, end_date: '...' } or { type: 'none' })
    is_active BOOLEAN DEFAULT TRUE, -- To easily disable a recurring reminder without deleting
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.reminders IS 'Stores user-defined reminders with recurrence options.';
COMMENT ON COLUMN public.reminders.user_id IS 'Foreign key referencing the user who owns the reminder.';
COMMENT ON COLUMN public.reminders.message IS 'The content/message of the reminder.';
COMMENT ON COLUMN public.reminders.reminder_datetime IS 'The primary date and time for the reminder (or the start date for recurring).';
COMMENT ON COLUMN public.reminders.recurrence_config IS 'JSON object detailing the recurrence pattern (type, interval, days, end condition, etc.).';
COMMENT ON COLUMN public.reminders.is_active IS 'Indicates if the reminder is currently active.';
COMMENT ON COLUMN public.reminders.created_at IS 'Timestamp when the reminder was created.';
COMMENT ON COLUMN public.reminders.updated_at IS 'Timestamp when the reminder was last updated.';

-- Create indexes for performance
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_reminder_datetime ON public.reminders(reminder_datetime);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER handle_reminder_update
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and manage their own reminders
CREATE POLICY "Allow users to manage their own reminders"
ON public.reminders
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
