-- Create the ai_treatment_planning_matrix table
CREATE TABLE public.ai_treatment_planning_matrix (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    urgency text,
    domain text,
    condition text,
    recommended_investigations text[],
    treatment_options text[],
    severity text,
    risk_impact text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.ai_treatment_planning_matrix IS 'Stores AI-driven treatment planning matrix data, imported from Excel.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.id IS 'Unique identifier for each matrix entry.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.urgency IS 'Urgency level (e.g., Routine, Priority, Urgent).';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.domain IS 'The domain category of the condition.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.condition IS 'The specific dental condition.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.recommended_investigations IS 'Array of recommended investigation procedures.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.treatment_options IS 'Array of possible treatment options.';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.severity IS 'Severity level (e.g., Low, Moderate, High).';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.risk_impact IS 'Risk impact level (e.g., Low, Moderate, High).';
COMMENT ON COLUMN public.ai_treatment_planning_matrix.created_at IS 'Timestamp of when the record was created.';

-- Enable Row Level Security
ALTER TABLE public.ai_treatment_planning_matrix ENABLE ROW LEVEL SECURITY;

-- Add a basic policy for public read access. Adjust as needed for your application's security requirements.
-- You might want policies restricted to authenticated users or specific roles.
CREATE POLICY "Allow public read access" ON public.ai_treatment_planning_matrix
    FOR SELECT USING (true);

-- Example policies for authenticated users (uncomment and adapt if needed):
-- CREATE POLICY "Allow authenticated read access" ON public.ai_treatment_planning_matrix
--     FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Allow insert for service_role" ON public.ai_treatment_planning_matrix
--     FOR INSERT TO service_role WITH CHECK (true);
-- CREATE POLICY "Allow update for service_role" ON public.ai_treatment_planning_matrix
--     FOR UPDATE TO service_role USING (true);
-- CREATE POLICY "Allow delete for service_role" ON public.ai_treatment_planning_matrix
--     FOR DELETE TO service_role USING (true);
