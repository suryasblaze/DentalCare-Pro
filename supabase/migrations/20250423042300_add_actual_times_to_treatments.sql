-- Add actual start and end time columns to the treatments table
ALTER TABLE public.treatments
ADD COLUMN actual_start_time timestamptz NULL,
ADD COLUMN actual_end_time timestamptz NULL;

-- Optional: Add comments to the new columns
COMMENT ON COLUMN public.treatments.actual_start_time IS 'Timestamp when the treatment actually started.';
COMMENT ON COLUMN public.treatments.actual_end_time IS 'Timestamp when the treatment actually ended (completed or cancelled).';
