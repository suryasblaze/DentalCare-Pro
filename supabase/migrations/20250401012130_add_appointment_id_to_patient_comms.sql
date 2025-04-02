-- Add appointment_id column to patient_communications
ALTER TABLE patient_communications
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_comms_appointment ON patient_communications (appointment_id);
