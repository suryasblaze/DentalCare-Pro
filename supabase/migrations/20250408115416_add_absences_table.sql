-- Migration SQL for adding absences table
CREATE TABLE public.absences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT absences_pkey PRIMARY KEY (id),
    CONSTRAINT absences_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE,
    CONSTRAINT absences_check CHECK ((end_time > start_time)) -- Ensure end time is after start time
);

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Policies grant access. Adjust based on your security requirements.
-- This allows anyone to read absences.
CREATE POLICY "Allow public read access" ON public.absences FOR SELECT USING (true);
-- These allow any logged-in user to manage absences. You might restrict this further,
-- e.g., to users with a specific role like 'admin' or 'manager'.
-- Example: CREATE POLICY "Allow insert for admins" ON public.absences FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Allow insert for authenticated users" ON public.absences FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update for authenticated users" ON public.absences FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete for authenticated users" ON public.absences FOR DELETE USING (auth.role() = 'authenticated');

-- Add an index for performance on staff_id and time range queries
CREATE INDEX idx_absences_staff_time ON public.absences USING btree (staff_id, start_time, end_time);

-- Optional: Add comment on table/columns
COMMENT ON TABLE public.absences IS 'Stores periods when staff members (doctors) are unavailable.';
COMMENT ON COLUMN public.absences.staff_id IS 'Foreign key referencing the staff member who is absent.';
COMMENT ON COLUMN public.absences.start_time IS 'The start date and time of the absence period.';
COMMENT ON COLUMN public.absences.end_time IS 'The end date and time of the absence period.';
COMMENT ON COLUMN public.absences.reason IS 'Optional reason for the absence (e.g., Vacation, Conference).';
