/*
  # Disable RLS Restrictions for Development

  1. Changes
    - Drop all existing policies
    - Create new unrestricted policies for all tables
    - Keep RLS enabled but make it permissive
    - Allow all operations for authenticated users

  2. Security Note
    - This is for development purposes only
    - Should be replaced with proper security policies before production
*/

-- Drop existing policies
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;
DROP POLICY IF EXISTS "medical_records_select_policy" ON medical_records;
DROP POLICY IF EXISTS "medical_records_insert_policy" ON medical_records;
DROP POLICY IF EXISTS "medical_records_update_policy" ON medical_records;
DROP POLICY IF EXISTS "treatment_plans_select_policy" ON treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_insert_policy" ON treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_update_policy" ON treatment_plans;
DROP POLICY IF EXISTS "treatments_select_policy" ON treatments;
DROP POLICY IF EXISTS "treatments_insert_policy" ON treatments;
DROP POLICY IF EXISTS "treatments_update_policy" ON treatments;

-- Create unrestricted policies for patients
CREATE POLICY "unrestricted_patients_policy" ON patients
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create unrestricted policies for appointments
CREATE POLICY "unrestricted_appointments_policy" ON appointments
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create unrestricted policies for medical_records
CREATE POLICY "unrestricted_medical_records_policy" ON medical_records
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create unrestricted policies for treatment_plans
CREATE POLICY "unrestricted_treatment_plans_policy" ON treatment_plans
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create unrestricted policies for treatments
CREATE POLICY "unrestricted_treatments_policy" ON treatments
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);