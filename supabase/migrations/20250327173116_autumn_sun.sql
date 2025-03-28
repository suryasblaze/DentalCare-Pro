/*
  # Fix RLS Policies for Patients Table

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper user authentication checks
    - Add policies for all CRUD operations
    - Ensure policies check for authenticated users

  2. Security
    - Policies require users to be authenticated
    - All operations are restricted to authenticated users only
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view all patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to create patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to update patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to delete patients" ON patients;

-- Re-enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper authentication checks
CREATE POLICY "Allow authenticated users to view all patients"
ON patients
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create patients"
ON patients
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update patients"
ON patients
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete patients"
ON patients
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');