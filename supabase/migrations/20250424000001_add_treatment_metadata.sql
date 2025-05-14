-- Begin transaction
BEGIN;

DO $$ 
BEGIN
    -- Create enum type for visit status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
        CREATE TYPE visit_status AS ENUM ('pending', 'completed', 'cancelled');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Create or replace the timestamp trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create treatment plan metadata table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatment_plan_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id uuid NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    clinical_considerations TEXT,
    key_materials TEXT,
    post_treatment_care TEXT,
    total_visits INTEGER DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_visits_count CHECK (completed_visits >= 0 AND total_visits >= completed_visits)
);

-- Create treatment visits table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatment_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id uuid NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    visit_number INTEGER NOT NULL,
    procedures TEXT NOT NULL,
    estimated_duration TEXT,
    time_gap TEXT,
    status visit_status NOT NULL DEFAULT 'pending'::visit_status,
    scheduled_date DATE,
    completed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_visit_number CHECK (visit_number > 0),
    CONSTRAINT valid_dates CHECK (
        (status = 'completed' AND completed_date IS NOT NULL) OR
        (status != 'completed' AND completed_date IS NULL)
    ),
    CONSTRAINT unique_visit_number UNIQUE (treatment_plan_id, visit_number)
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatment_plan_metadata_plan_id') THEN
        CREATE INDEX idx_treatment_plan_metadata_plan_id ON treatment_plan_metadata(treatment_plan_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatment_visits_plan_id') THEN
        CREATE INDEX idx_treatment_visits_plan_id ON treatment_visits(treatment_plan_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatment_visits_status') THEN
        CREATE INDEX idx_treatment_visits_status ON treatment_visits(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_treatment_visits_scheduled_date') THEN
        CREATE INDEX idx_treatment_visits_scheduled_date ON treatment_visits(scheduled_date);
    END IF;
END $$;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS set_timestamp_treatment_plan_metadata ON treatment_plan_metadata;
CREATE TRIGGER set_timestamp_treatment_plan_metadata
    BEFORE UPDATE ON treatment_plan_metadata
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_treatment_visits ON treatment_visits;
CREATE TRIGGER set_timestamp_treatment_visits
    BEFORE UPDATE ON treatment_visits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE treatment_plan_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_visits ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON treatment_plan_metadata;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON treatment_visits;

CREATE POLICY "Enable all access for authenticated users" ON treatment_plan_metadata
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON treatment_visits
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON treatment_plan_metadata TO authenticated;
GRANT ALL ON treatment_plan_metadata TO service_role;
GRANT ALL ON treatment_visits TO authenticated;
GRANT ALL ON treatment_visits TO service_role;

-- Create functions for managing visits
CREATE OR REPLACE FUNCTION update_completed_visits_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE treatment_plan_metadata
        SET completed_visits = completed_visits + 1
        WHERE treatment_plan_id = NEW.treatment_plan_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status != 'completed' AND OLD.status = 'completed' THEN
        UPDATE treatment_plan_metadata
        SET completed_visits = GREATEST(0, completed_visits - 1)
        WHERE treatment_plan_id = NEW.treatment_plan_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating completed visits count
DROP TRIGGER IF EXISTS update_completed_visits_count_trigger ON treatment_visits;
CREATE TRIGGER update_completed_visits_count_trigger
    AFTER UPDATE OF status ON treatment_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_visits_count();

-- Create view for treatment plan details
CREATE OR REPLACE VIEW treatment_plan_details AS
WITH visit_details AS (
    SELECT 
        treatment_plan_id,
        json_agg(
            json_build_object(
                'id', id,
                'visit_number', visit_number,
                'procedures', procedures,
                'estimated_duration', estimated_duration,
                'time_gap', time_gap,
                'status', status,
                'scheduled_date', scheduled_date,
                'completed_date', completed_date
            ) ORDER BY visit_number
        ) FILTER (WHERE id IS NOT NULL) as visits,
        count(*) FILTER (WHERE status = 'completed') as completed_count,
        count(*) as total_count
    FROM treatment_visits
    GROUP BY treatment_plan_id
)
SELECT 
    tp.*,
    tpm.clinical_considerations,
    tpm.key_materials,
    tpm.post_treatment_care,
    COALESCE(vd.completed_count, 0) as completed_visits,
    COALESCE(vd.total_count, 0) as total_visits,
    COALESCE(vd.visits, '[]'::json) as visits
FROM 
    treatment_plans tp
LEFT JOIN 
    treatment_plan_metadata tpm ON tp.id = tpm.treatment_plan_id
LEFT JOIN 
    visit_details vd ON tp.id = vd.treatment_plan_id;

-- Create function to create a full treatment plan with visits
CREATE OR REPLACE FUNCTION create_treatment_plan_with_visits(
    plan_data json,
    metadata_data json,
    visits_data json
) RETURNS json AS $$
DECLARE
    created_plan_id uuid;
    result json;
BEGIN
    -- Create the treatment plan
    INSERT INTO treatment_plans
    SELECT * FROM json_populate_record(null::treatment_plans, plan_data)
    RETURNING id INTO created_plan_id;

    -- Create the metadata
    INSERT INTO treatment_plan_metadata (
        treatment_plan_id,
        clinical_considerations,
        key_materials,
        post_treatment_care,
        total_visits
    )
    SELECT 
        created_plan_id,
        (metadata_data->>'clinical_considerations')::text,
        (metadata_data->>'key_materials')::text,
        (metadata_data->>'post_treatment_care')::text,
        (metadata_data->>'total_visits')::integer;

    -- Create the visits
    INSERT INTO treatment_visits (
        treatment_plan_id,
        visit_number,
        procedures,
        estimated_duration,
        time_gap,
        scheduled_date
    )
    SELECT
        created_plan_id,
        (visit->>'visit_number')::integer,
        (visit->>'procedures')::text,
        (visit->>'estimated_duration')::text,
        (visit->>'time_gap')::text,
        (visit->>'scheduled_date')::date
    FROM json_array_elements(visits_data) as visit;

    -- Return the created plan with all details
    SELECT row_to_json(t)
    FROM (
        SELECT * FROM treatment_plan_details WHERE id = created_plan_id
    ) t INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT; 