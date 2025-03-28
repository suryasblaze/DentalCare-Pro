/*
  # Add Staff Management

  1. New Tables
    - `staff`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `role` (text: 'doctor', 'assistant', 'receptionist')
      - `specialization` (text, for doctors)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes to Existing Tables
    - Add `staff_id` to appointments table
    - Add working hours and availability tracking

  3. Security
    - Enable RLS
    - Add policies for staff management
*/

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('doctor', 'assistant', 'receptionist')),
  specialization text,
  working_hours jsonb DEFAULT '[{"day": "monday", "start": "09:00", "end": "17:00"},
                               {"day": "tuesday", "start": "09:00", "end": "17:00"},
                               {"day": "wednesday", "start": "09:00", "end": "17:00"},
                               {"day": "thursday", "start": "09:00", "end": "17:00"},
                               {"day": "friday", "start": "09:00", "end": "17:00"}]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT staff_specialization_check CHECK (
    (role = 'doctor' AND specialization IS NOT NULL) OR
    (role != 'doctor' AND specialization IS NULL)
  )
);

-- Add staff_id to appointments
ALTER TABLE appointments
ADD COLUMN staff_id uuid REFERENCES staff(id),
ADD COLUMN color text DEFAULT '#2563eb';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff (role);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments (staff_id);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "unrestricted_access_policy"
ON staff FOR ALL
TO public
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();