-- Create the patient_tooth_conditions table
CREATE TABLE public.patient_tooth_conditions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    tooth_id integer NOT NULL REFERENCES public.teeth(id) ON DELETE CASCADE, -- Assuming 'teeth' table has integer IDs based on previous migrations
    conditions text[] NOT NULL DEFAULT ARRAY['healthy']::text[], -- Array of condition strings, default to healthy
    last_updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX idx_patient_tooth_conditions_patient_id ON public.patient_tooth_conditions(patient_id);
CREATE INDEX idx_patient_tooth_conditions_tooth_id ON public.patient_tooth_conditions(tooth_id);

-- Ensure only one entry per tooth per patient
ALTER TABLE public.patient_tooth_conditions
ADD CONSTRAINT patient_tooth_conditions_patient_id_tooth_id_key UNIQUE (patient_id, tooth_id);

-- Enable Row Level Security
ALTER TABLE public.patient_tooth_conditions ENABLE ROW LEVEL SECURITY;

-- Policies: Adjust these based on your actual authorization rules
-- Policy 1: Allow authenticated users (e.g., staff) to view all conditions
CREATE POLICY "Allow authenticated users to view conditions"
ON public.patient_tooth_conditions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users (e.g., staff) to insert conditions
CREATE POLICY "Allow authenticated users to insert conditions"
ON public.patient_tooth_conditions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users (e.g., staff) to update conditions
CREATE POLICY "Allow authenticated users to update conditions"
ON public.patient_tooth_conditions
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users (e.g., staff) to delete conditions (optional, maybe restrict this)
CREATE POLICY "Allow authenticated users to delete conditions"
ON public.patient_tooth_conditions
FOR DELETE
USING (auth.role() = 'authenticated');

-- Function to automatically update last_updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_last_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_updated_at = timezone('utc', now());
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update last_updated_at on row update
CREATE TRIGGER update_patient_tooth_conditions_last_updated_at
BEFORE UPDATE ON public.patient_tooth_conditions
FOR EACH ROW
EXECUTE FUNCTION public.update_last_updated_at_column();

COMMENT ON TABLE public.patient_tooth_conditions IS 'Stores the current condition state for each tooth of a patient.';
COMMENT ON COLUMN public.patient_tooth_conditions.conditions IS 'Array of current conditions (e.g., {filled, crown}).';
