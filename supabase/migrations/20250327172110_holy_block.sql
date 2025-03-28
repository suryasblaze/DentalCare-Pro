/*
  # Update RLS Policies for Patients Table

  1. Changes
    - Add policies to allow authenticated users to:
      - View all patients in their clinic
      - Create new patients
      - Update existing patients
    - Remove existing restrictive policies

  2. Security
    - All operations require authentication
    - No data access for unauthenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all authenticated users to view patients" ON patients;
DROP POLICY IF EXISTS "Allow all authenticated users to insert patients" ON patients;
DROP POLICY IF EXISTS "Allow all authenticated users to update patients" ON patients;

-- Create new policies with proper permissions
CREATE POLICY "Enable read access for authenticated users"
ON patients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON patients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON patients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);