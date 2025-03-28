/*
  # Enhanced Medical Records System

  1. Updates
    - Add additional metadata to medical records
    - Improve attachments structure
    - Add constraints for better data validation

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add a structured attachments column definition
CREATE OR REPLACE FUNCTION validate_medical_record_attachments()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate attachments format if present
  IF NEW.attachments IS NOT NULL AND jsonb_typeof(NEW.attachments) != 'array' THEN
    RAISE EXCEPTION 'attachments must be a JSON array';
  END IF;

  -- Check each attachment in the array
  IF NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0 THEN
    FOR i IN 0..jsonb_array_length(NEW.attachments) - 1 LOOP
      IF jsonb_typeof(NEW.attachments->i) != 'object' THEN
        RAISE EXCEPTION 'Each attachment must be a JSON object';
      END IF;
      
      IF (NEW.attachments->i->'name') IS NULL OR jsonb_typeof(NEW.attachments->i->'name') != 'string' THEN
        RAISE EXCEPTION 'Each attachment must have a name';
      END IF;
      
      IF (NEW.attachments->i->'type') IS NULL OR jsonb_typeof(NEW.attachments->i->'type') != 'string' THEN
        RAISE EXCEPTION 'Each attachment must have a type';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate attachments
DROP TRIGGER IF EXISTS validate_medical_record_attachments_trigger ON medical_records;
CREATE TRIGGER validate_medical_record_attachments_trigger
BEFORE INSERT OR UPDATE ON medical_records
FOR EACH ROW
EXECUTE FUNCTION validate_medical_record_attachments();

-- Add metadata about record creation
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff(id);

COMMENT ON COLUMN medical_records.attachments IS 'JSON array of attachments with name, type, url, notes, and date_added fields';