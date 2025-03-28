/*
  # Fix RLS Policies for Patients Table

  1. Changes
    - Drop existing policies that may be conflicting
    - Create new, more specific RLS policies for the patients table
    - Add policies for all CRUD operations
    - Ensure authenticated users can manage patient records

  2. Security
    - Enable RLS on patients table
    - Add specific policies for each operation type
    - Ensure proper access control for authenticated users
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON patients;

-- Re-enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Allow authenticated users to view all patients"
ON patients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create patients"
ON patients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update patients"
ON patients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete patients"
ON patients
FOR DELETE
TO authenticated
USING (true);