/*
  # Replace Date of Birth with Age

  1. Changes
    - Remove date_of_birth column
    - Add age column (integer)
    - Add age validation check

  2. Data Migration
    - Calculate and populate age for existing records
*/

-- Add new age column
ALTER TABLE patients ADD COLUMN age integer;

-- Add age validation
ALTER TABLE patients ADD CONSTRAINT age_check CHECK (
  age >= 0 AND age <= 120
);

-- Calculate age from date_of_birth for existing records
UPDATE patients 
SET age = EXTRACT(YEAR FROM age(date_of_birth::date))
WHERE date_of_birth IS NOT NULL;

-- Drop date_of_birth column
ALTER TABLE patients DROP COLUMN date_of_birth;