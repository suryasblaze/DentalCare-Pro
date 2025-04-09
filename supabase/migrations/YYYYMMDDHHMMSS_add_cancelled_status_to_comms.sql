-- Add 'cancelled' to the communication status enum
-- Note: Supabase/Postgres doesn't have a simple ALTER TYPE ADD VALUE IF NOT EXISTS,
-- so this might involve dropping and recreating constraints or types in complex scenarios,
-- but for a simple enum addition, directly altering might work depending on usage.
-- A safer approach often involves creating a new type and migrating the column.
-- Let's try the simpler ALTER TYPE first. If this fails during migration,
-- a more complex migration script would be needed.

-- Attempt 1: Simple ALTER TYPE (May fail if type is heavily used in views/functions)
-- ALTER TYPE communication_status ADD VALUE 'cancelled'; 
-- If the above fails, comment it out and use the more robust method below.

-- Attempt 2: Robust Enum Update (Rename old, create new, update table, drop old)
-- Step 1: Rename the existing enum type
ALTER TYPE communication_status RENAME TO communication_status_old;

-- Step 2: Create the new enum type with the added value
CREATE TYPE communication_status AS ENUM (
  'scheduled', 
  'sent', 
  'failed', 
  'cancelled' -- Added value
);

-- Step 3: Update the table to use the new enum type
ALTER TABLE patient_communications 
ALTER COLUMN status TYPE communication_status 
USING status::text::communication_status;

-- Step 4: Drop the old enum type
DROP TYPE communication_status_old;

-- Add an index for faster lookup of cancellable communications
CREATE INDEX IF NOT EXISTS idx_patient_communications_cancellable 
ON patient_communications (appointment_id, status) 
WHERE status = 'scheduled';
