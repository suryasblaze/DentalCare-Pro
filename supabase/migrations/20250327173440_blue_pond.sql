/*
  # Unrestricted Development Policies

  1. Changes
    - Drop all existing policies
    - Create single unrestricted policy for each table
    - Keep RLS enabled but make it completely permissive
    - Allow all operations without any checks

  Note: This is for development only and should be replaced with proper security policies before production
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "unrestricted_patients_policy" ON patients;
DROP POLICY IF EXISTS "unrestricted_appointments_policy" ON appointments;
DROP POLICY IF EXISTS "unrestricted_medical_records_policy" ON medical_records;
DROP POLICY IF EXISTS "unrestricted_treatment_plans_policy" ON treatment_plans;
DROP POLICY IF EXISTS "unrestricted_treatments_policy" ON treatments;

-- Create completely unrestricted policies for all tables
CREATE POLICY "unrestricted_access_policy" ON patients FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON appointments FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON medical_records FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON treatment_plans FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON treatments FOR ALL USING (true);