/*
  # Fix RLS Policies for All Tables

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper authentication checks
    - Add policies for all tables (patients, appointments, medical_records, treatment_plans, treatments)
    - Ensure consistent policy naming and checks

  2. Security
    - All policies require users to be authenticated
    - All operations are restricted to authenticated users only
    - Consistent auth.role() checks across all policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view all patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to create patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to update patients" ON patients;
DROP POLICY IF EXISTS "Allow authenticated users to delete patients" ON patients;

-- Re-enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Patients table policies
CREATE POLICY "patients_select_policy"
ON patients FOR SELECT
TO authenticated
USING (auth.role() IS NOT NULL);

CREATE POLICY "patients_insert_policy"
ON patients FOR INSERT
TO authenticated
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "patients_update_policy"
ON patients FOR UPDATE
TO authenticated
USING (auth.role() IS NOT NULL)
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "patients_delete_policy"
ON patients FOR DELETE
TO authenticated
USING (auth.role() IS NOT NULL);

-- Appointments table policies
CREATE POLICY "appointments_select_policy"
ON appointments FOR SELECT
TO authenticated
USING (auth.role() IS NOT NULL);

CREATE POLICY "appointments_insert_policy"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "appointments_update_policy"
ON appointments FOR UPDATE
TO authenticated
USING (auth.role() IS NOT NULL)
WITH CHECK (auth.role() IS NOT NULL);

-- Medical Records table policies
CREATE POLICY "medical_records_select_policy"
ON medical_records FOR SELECT
TO authenticated
USING (auth.role() IS NOT NULL);

CREATE POLICY "medical_records_insert_policy"
ON medical_records FOR INSERT
TO authenticated
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "medical_records_update_policy"
ON medical_records FOR UPDATE
TO authenticated
USING (auth.role() IS NOT NULL)
WITH CHECK (auth.role() IS NOT NULL);

-- Treatment Plans table policies
CREATE POLICY "treatment_plans_select_policy"
ON treatment_plans FOR SELECT
TO authenticated
USING (auth.role() IS NOT NULL);

CREATE POLICY "treatment_plans_insert_policy"
ON treatment_plans FOR INSERT
TO authenticated
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "treatment_plans_update_policy"
ON treatment_plans FOR UPDATE
TO authenticated
USING (auth.role() IS NOT NULL)
WITH CHECK (auth.role() IS NOT NULL);

-- Treatments table policies
CREATE POLICY "treatments_select_policy"
ON treatments FOR SELECT
TO authenticated
USING (auth.role() IS NOT NULL);

CREATE POLICY "treatments_insert_policy"
ON treatments FOR INSERT
TO authenticated
WITH CHECK (auth.role() IS NOT NULL);

CREATE POLICY "treatments_update_policy"
ON treatments FOR UPDATE
TO authenticated
USING (auth.role() IS NOT NULL)
WITH CHECK (auth.role() IS NOT NULL);