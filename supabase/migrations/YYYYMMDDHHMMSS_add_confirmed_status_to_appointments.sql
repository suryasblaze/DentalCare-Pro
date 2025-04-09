-- Assuming the status is controlled by an ENUM type named 'appointment_status'
-- If it's a CHECK constraint, the syntax will differ slightly.

-- Add the new 'confirmed' value to the existing enum type
-- IMPORTANT: Run this in a transaction block if possible
BEGIN;

-- Step 1: Add the new value to the enum type
-- Use ALTER TYPE ... ADD VALUE IF NOT EXISTS for safety
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'confirmed';

-- Note: If the status is enforced by a CHECK constraint instead of an enum,
-- you would modify the constraint like this (replace 'appointments_status_check'
-- with the actual constraint name):
-- ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
-- ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
-- CHECK (status IN ('scheduled', 'completed', 'cancelled', 'confirmed'));

COMMIT;

-- No changes needed for patient_communications status handling based on this request.
