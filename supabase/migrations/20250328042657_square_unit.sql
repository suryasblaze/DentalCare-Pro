/*
  # Enhanced Patient Profile for Comprehensive Onboarding

  1. Changes to Patients Table
    - Add additional profile fields
    - Add medical history fields
    - Add insurance fields
    - Add audit trail support
    - Add photo and signature storage

  2. Security
    - Maintain existing RLS policies
*/

-- Add new fields to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country text DEFAULT 'USA';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status text CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated', 'other'));

-- Medical history fields
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'));
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height numeric(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight numeric(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies text[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_conditions text[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications jsonb DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_medical_history jsonb DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lifestyle_habits jsonb DEFAULT '{"smoking": false, "alcohol": false, "exercise": false}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS previous_surgeries jsonb DEFAULT '[]';

-- Insurance information
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_number text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_expiry_date date;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_coverage_details jsonb DEFAULT '{}';

-- File storage and signatures
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';

-- Audit and system fields
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES auth.users(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS audit_trail jsonb DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_date timestamp with time zone;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'));

-- Add trigger function to track changes for audit trail
CREATE OR REPLACE FUNCTION update_patient_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  change_record jsonb;
BEGIN
  -- Don't track changes to the audit trail itself or updated_at
  IF (NEW.audit_trail = OLD.audit_trail AND NEW.updated_at != OLD.updated_at) THEN
    RETURN NEW;
  END IF;

  -- Create a record of what changed
  change_record = jsonb_build_object(
    'timestamp', now(),
    'user_id', COALESCE(NEW.last_modified_by, current_setting('request.jwt.claims', true)::jsonb->>'sub'),
    'changes', jsonb_object_agg(
      key, jsonb_build_object('old', value, 'new', NEW.row_to_json->>key)
    ) FILTER (WHERE NEW.row_to_json->>key IS DISTINCT FROM value)
  );

  -- Append to audit trail, limiting to last 100 changes
  NEW.audit_trail = (
    SELECT jsonb_agg(elem)
    FROM (
      SELECT elem
      FROM jsonb_array_elements(COALESCE(OLD.audit_trail, '[]'::jsonb)) AS elem
      UNION ALL
      SELECT change_record
      ORDER BY (elem->>'timestamp')::timestamp DESC
      LIMIT 100
    ) sub
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, just return NEW without updating audit trail
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update audit trail
CREATE TRIGGER patient_audit_trail_trigger
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_patient_audit_trail();

-- Add indexes for new searchable fields
CREATE INDEX IF NOT EXISTS idx_patients_insurance_policy ON patients (insurance_policy_number);
CREATE INDEX IF NOT EXISTS idx_patients_emergency_contact ON patients (emergency_contact_phone);
CREATE INDEX IF NOT EXISTS idx_patients_blood_group ON patients (blood_group);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients (status);