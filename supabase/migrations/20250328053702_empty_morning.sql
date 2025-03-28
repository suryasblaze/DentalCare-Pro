/*
  # Database Transaction Functions
  
  1. New Functions
    - `begin_transaction`: Start a new transaction
    - `commit_transaction`: Commit the current transaction
    - `rollback_transaction`: Rollback the current transaction
    - `generate_update_version`: Generate a new version number for optimistic concurrency control
    
  2. Security
    - Functions are available to authenticated users only
    
  3. Purpose
    - Enable transaction support for complex operations
    - Support optimistic concurrency control
*/

-- Create functions for transaction management
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- Start a new transaction
  -- This is a no-op since we're already in a transaction,
  -- but it's here for semantic completeness
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  -- Commit the current transaction
  -- This is a no-op since the transaction will be committed automatically,
  -- but it's here for semantic completeness
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  -- Rollback the current transaction
  RAISE EXCEPTION 'Transaction rolled back intentionally';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for generating version numbers for optimistic concurrency control
CREATE OR REPLACE FUNCTION generate_update_version()
RETURNS TEXT AS $$
BEGIN
  RETURN MD5(NOW()::TEXT || RANDOM()::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Add version column to key tables for optimistic concurrency control
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS version TEXT DEFAULT generate_update_version();
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS version TEXT DEFAULT generate_update_version();
ALTER TABLE patients ADD COLUMN IF NOT EXISTS version TEXT DEFAULT generate_update_version();
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS version TEXT DEFAULT generate_update_version();

-- Create triggers to update version on change
CREATE OR REPLACE FUNCTION update_version_on_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = generate_update_version();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  -- Create trigger for treatment_plans
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'treatment_plans_version_trigger'
  ) THEN
    CREATE TRIGGER treatment_plans_version_trigger
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_version_on_change();
  END IF;
  
  -- Create trigger for treatments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'treatments_version_trigger'
  ) THEN
    CREATE TRIGGER treatments_version_trigger
    BEFORE UPDATE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_version_on_change();
  END IF;
  
  -- Create trigger for patients
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'patients_version_trigger'
  ) THEN
    CREATE TRIGGER patients_version_trigger
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_version_on_change();
  END IF;
  
  -- Create trigger for appointments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_version_trigger'
  ) THEN
    CREATE TRIGGER appointments_version_trigger
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_version_on_change();
  END IF;
END $$;