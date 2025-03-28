/*
  # AI Treatment Planning System Enhancement

  1. New Tables
    - `ai_treatment_plans`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `content` (jsonb, stores the complete AI-generated plan)
      - `status` (text: 'generated', 'reviewed', 'approved', 'implemented', 'completed', 'rejected')
      - `approved_by` (uuid, references staff)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `treatment_consents`
      - `id` (uuid, primary key)
      - `treatment_plan_id` (uuid, foreign key)
      - `patient_id` (uuid, foreign key)
      - `consent_document` (jsonb, the detailed consent information)
      - `signed_at` (timestamp)
      - `signature_url` (text)
      - `witness_id` (uuid, references staff)
      - `status` (text: 'pending', 'signed', 'declined', 'expired')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `patient_communications`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `type` (text: 'appointment_reminder', 'treatment_info', 'post_treatment', 'education', 'follow_up')
      - `content` (text)
      - `scheduled_for` (timestamp)
      - `sent_at` (timestamp)
      - `channel` (text: 'email', 'sms', 'app')
      - `status` (text: 'scheduled', 'sent', 'delivered', 'failed')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add appropriate policies
*/

-- Create AI treatment plans table
CREATE TABLE IF NOT EXISTS ai_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'approved', 'implemented', 'completed', 'rejected')),
  approved_by uuid REFERENCES staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create treatment consents table
CREATE TABLE IF NOT EXISTS treatment_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id uuid REFERENCES treatment_plans(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  consent_document jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz,
  signature_url text,
  witness_id uuid REFERENCES staff(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT signed_with_signature CHECK (
    (status != 'signed') OR (signed_at IS NOT NULL AND signature_url IS NOT NULL)
  )
);

-- Create patient communications table
CREATE TABLE IF NOT EXISTS patient_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('appointment_reminder', 'treatment_info', 'post_treatment', 'education', 'follow_up')),
  content text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'app')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_treatment_plans_patient ON ai_treatment_plans (patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_treatment_plans_status ON ai_treatment_plans (status);
CREATE INDEX IF NOT EXISTS idx_treatment_consents_plan ON treatment_consents (treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_consents_patient ON treatment_consents (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_consents_status ON treatment_consents (status);
CREATE INDEX IF NOT EXISTS idx_patient_communications_patient ON patient_communications (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_communications_scheduled ON patient_communications (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_patient_communications_status ON patient_communications (status);

-- Enable RLS
ALTER TABLE ai_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_communications ENABLE ROW LEVEL SECURITY;

-- Create unrestricted access policies for development
CREATE POLICY "unrestricted_access_policy" ON ai_treatment_plans FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON treatment_consents FOR ALL USING (true);
CREATE POLICY "unrestricted_access_policy" ON patient_communications FOR ALL USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_ai_treatment_plans_updated_at
  BEFORE UPDATE ON ai_treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_treatment_consents_updated_at
  BEFORE UPDATE ON treatment_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_patient_communications_updated_at
  BEFORE UPDATE ON patient_communications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add additional fields to treatment_plans table to support AI integration
ALTER TABLE treatment_plans 
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_plan_id uuid REFERENCES ai_treatment_plans(id),
  ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"sms": false, "email": true, "whatsapp": false}',
  ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_status TEXT CHECK (consent_status IN ('pending', 'signed', 'declined', 'expired')),
  ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS next_communication_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_notification_sent TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

-- Create index for communications scheduling
CREATE INDEX IF NOT EXISTS idx_treatment_plans_next_communication 
  ON treatment_plans (next_communication_date) 
  WHERE next_communication_date IS NOT NULL;