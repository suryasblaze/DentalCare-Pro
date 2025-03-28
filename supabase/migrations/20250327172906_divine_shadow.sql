/*
  # Enhanced Patient Management System

  1. New Tables
    - `medical_records`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `record_date` (timestamp)
      - `record_type` (text)
      - `description` (text)
      - `attachments` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `treatment_plans`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `status` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `treatments`
      - `id` (uuid, primary key)
      - `plan_id` (uuid, foreign key)
      - `type` (text)
      - `description` (text)
      - `status` (text)
      - `cost` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  record_date timestamptz NOT NULL DEFAULT now(),
  record_type text NOT NULL CHECK (record_type IN ('examination', 'procedure', 'prescription', 'lab_result', 'note')),
  description text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create treatment_plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create treatments table
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES treatment_plans(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  cost numeric(10,2) NOT NULL CHECK (cost >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records (patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records (record_date);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans (status);
CREATE INDEX IF NOT EXISTS idx_treatments_plan ON treatments (plan_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments (status);

-- Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Create policies for medical_records
CREATE POLICY "Allow authenticated users to view medical records"
  ON medical_records FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create medical records"
  ON medical_records FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update medical records"
  ON medical_records FOR UPDATE TO authenticated
  USING (true);

-- Create policies for treatment_plans
CREATE POLICY "Allow authenticated users to view treatment plans"
  ON treatment_plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create treatment plans"
  ON treatment_plans FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update treatment plans"
  ON treatment_plans FOR UPDATE TO authenticated
  USING (true);

-- Create policies for treatments
CREATE POLICY "Allow authenticated users to view treatments"
  ON treatments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create treatments"
  ON treatments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update treatments"
  ON treatments FOR UPDATE TO authenticated
  USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();