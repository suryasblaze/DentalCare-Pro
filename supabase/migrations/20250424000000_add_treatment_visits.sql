-- Create enum type for treatment plan status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_plan_status') THEN
        CREATE TYPE treatment_plan_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
    END IF;
END$$;

-- Create enum type for treatment plan priority if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_plan_priority') THEN
        CREATE TYPE treatment_plan_priority AS ENUM ('low', 'medium', 'high');
    END IF;
END$$;

-- Create the trigger function for updating timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create treatment_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatment_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status treatment_plan_status DEFAULT 'planned',
    priority treatment_plan_priority DEFAULT 'medium',
    start_date DATE,
    estimated_cost DECIMAL(10,2),
    ai_generated BOOLEAN DEFAULT false,
    clinical_considerations TEXT,
    key_materials TEXT,
    post_treatment_care TEXT,
    total_visits INTEGER,
    completed_visits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create treatment_visits table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatment_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id uuid REFERENCES treatment_plans(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL,
    procedures TEXT NOT NULL,
    estimated_duration TEXT,
    time_gap TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create treatment_plan_teeth junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatment_plan_teeth (
    treatment_plan_id uuid REFERENCES treatment_plans(id) ON DELETE CASCADE,
    tooth_id INTEGER NOT NULL,
    PRIMARY KEY (treatment_plan_id, tooth_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_visits_plan ON treatment_visits(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_visits_status ON treatment_visits(status);

-- Add triggers for updating timestamps
DROP TRIGGER IF EXISTS set_timestamp_treatment_plans ON treatment_plans;
CREATE TRIGGER set_timestamp_treatment_plans
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_treatment_visits ON treatment_visits;
CREATE TRIGGER set_timestamp_treatment_visits
    BEFORE UPDATE ON treatment_visits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_teeth ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON treatment_plans;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON treatment_visits;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON treatment_plan_teeth;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON treatment_plans
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON treatment_visits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON treatment_plan_teeth
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON treatment_plans TO authenticated;
GRANT ALL ON treatment_plans TO service_role;
GRANT ALL ON treatment_visits TO authenticated;
GRANT ALL ON treatment_visits TO service_role;
GRANT ALL ON treatment_plan_teeth TO authenticated;
GRANT ALL ON treatment_plan_teeth TO service_role;

-- Create functions for handling treatment plans
CREATE OR REPLACE FUNCTION get_treatment_plan_details(p_plan_id uuid)
RETURNS TABLE (
    plan_id uuid,
    patient_id uuid,
    title text,
    description text,
    status treatment_plan_status,
    priority treatment_plan_priority,
    start_date date,
    estimated_cost decimal,
    total_visits integer,
    completed_visits integer,
    teeth integer[],
    visits json[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id,
        tp.patient_id,
        tp.title,
        tp.description,
        tp.status,
        tp.priority,
        tp.start_date,
        tp.estimated_cost,
        tp.total_visits,
        tp.completed_visits,
        ARRAY_AGG(DISTINCT tpt.tooth_id) as teeth,
        ARRAY_AGG(
            json_build_object(
                'visit_id', tv.id,
                'visit_number', tv.visit_number,
                'procedures', tv.procedures,
                'status', tv.status,
                'scheduled_date', tv.scheduled_date,
                'completed_date', tv.completed_date
            )
        ) as visits
    FROM treatment_plans tp
    LEFT JOIN treatment_plan_teeth tpt ON tp.id = tpt.treatment_plan_id
    LEFT JOIN treatment_visits tv ON tp.id = tv.treatment_plan_id
    WHERE tp.id = p_plan_id
    GROUP BY tp.id;
END;
$$ LANGUAGE plpgsql; 