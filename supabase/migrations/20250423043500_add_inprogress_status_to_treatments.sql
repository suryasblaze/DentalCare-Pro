-- Add 'in_progress' value to the treatment_status enum type
-- Note: Adding enum values is typically non-transactional in PostgreSQL, 
-- but Supabase CLI handles migrations carefully.

-- Check if the type exists before altering (optional safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_status') THEN
        -- Create the type if it doesn't exist (adjust values as needed)
        CREATE TYPE public.treatment_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    ELSE
        -- Add the value if the type exists
        -- Use IF NOT EXISTS to avoid error if value already added manually
        ALTER TYPE public.treatment_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'pending'; 
    END IF;
END $$;

-- Add comment
COMMENT ON TYPE public.treatment_status IS 'Possible statuses for an individual treatment procedure.';
