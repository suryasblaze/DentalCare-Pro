-- Migration to create a table linking selected teeth to patient dental history

-- Drop table if it exists (optional, for easier rerunning during development)
DROP TABLE IF EXISTS public.patient_dental_history_teeth;

-- Create the patient_dental_history_teeth table
CREATE TABLE public.patient_dental_history_teeth (
    patient_id uuid NOT NULL,
    tooth_id integer NOT NULL,
    conditions text[] NOT NULL DEFAULT ARRAY['healthy']::text[], -- Added conditions column (array of text)
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT patient_dental_history_teeth_pkey PRIMARY KEY (patient_id, tooth_id), -- Composite primary key
    CONSTRAINT patient_dental_history_teeth_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
    CONSTRAINT patient_dental_history_teeth_tooth_id_fkey FOREIGN KEY (tooth_id) REFERENCES public.teeth(id) ON DELETE CASCADE -- Assuming 'teeth' table exists with integer IDs
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.patient_dental_history_teeth IS 'Junction table to store teeth marked as affected in the patient''s general dental history form, including their conditions at that time.';
COMMENT ON COLUMN public.patient_dental_history_teeth.patient_id IS 'Foreign key referencing the patient.';
COMMENT ON COLUMN public.patient_dental_history_teeth.tooth_id IS 'Foreign key referencing the specific tooth (using FDI notation number).';
COMMENT ON COLUMN public.patient_dental_history_teeth.conditions IS 'Array of conditions associated with the tooth in the dental history context.';
COMMENT ON COLUMN public.patient_dental_history_teeth.created_at IS 'Timestamp of when the record was created.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.patient_dental_history_teeth ENABLE ROW LEVEL SECURITY;

-- Policies for RLS (adjust based on your application's auth rules)
-- Example: Allow authenticated users to manage their own patient's linked teeth (assuming a link exists or based on roles)
-- You'll need to define appropriate policies based on your user roles and relationships.
-- Placeholder policies (adjust as needed):
CREATE POLICY "Allow select for authenticated users" ON public.patient_dental_history_teeth
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON public.patient_dental_history_teeth
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
    -- Add specific checks, e.g., ensure the user is linked to the patient_id

CREATE POLICY "Allow delete for authenticated users" ON public.patient_dental_history_teeth
    FOR DELETE
    USING (auth.role() = 'authenticated');
    -- Add specific checks

-- Grant permissions to roles (e.g., authenticated, service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patient_dental_history_teeth TO authenticated;
GRANT ALL ON TABLE public.patient_dental_history_teeth TO service_role;
