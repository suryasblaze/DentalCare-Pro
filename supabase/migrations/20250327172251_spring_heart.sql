/*
  # Update Patient Phone Requirements and Search Optimization

  1. Changes
    - Make phone number required (NOT NULL)
    - Add registration number column
    - Create indexes for efficient searching on:
      - phone number
      - registration number
      - combined name search (first_name + last_name)
    - Add constraint to ensure phone numbers are properly formatted

  2. Security
    - Maintain existing RLS policies
    - No data access for unauthenticated users
*/

-- Add registration number column
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_number text UNIQUE NOT NULL DEFAULT 'REG-' || substr(gen_random_uuid()::text, 1, 8);

-- Make phone number required and add format validation
ALTER TABLE patients 
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT phone_format_check CHECK (
    phone ~ '^\+?[1-9]\d{1,14}$' -- Follows E.164 format recommendation
  );

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients (phone);
CREATE INDEX IF NOT EXISTS patients_registration_number_idx ON patients (registration_number);
CREATE INDEX IF NOT EXISTS patients_full_name_idx ON patients (first_name text_pattern_ops, last_name text_pattern_ops);

-- Update existing null phone numbers with a placeholder (if any exist)
DO $$ 
BEGIN 
  UPDATE patients SET phone = '+0000000000' WHERE phone IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;