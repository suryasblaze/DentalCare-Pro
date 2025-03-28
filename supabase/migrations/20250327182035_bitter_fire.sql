/*
  # Add clinic settings management

  1. New Tables
    - `clinic_settings`
      - `id` (uuid, primary key)
      - `name` (text, clinic name)
      - `address` (text, clinic address)
      - `phone` (text, clinic phone)
      - `email` (text, clinic email)
      - `website` (text, clinic website)
      - `working_hours` (jsonb, clinic working hours)
      - `notification_preferences` (jsonb, notification settings)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `clinic_settings` table
    - Add policy for authenticated users to read/write settings

  3. Triggers
    - Add trigger to update `updated_at` timestamp
*/

-- Create clinic settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  working_hours jsonb DEFAULT '[
    {"day": "monday", "start": "09:00", "end": "17:00", "is_open": true},
    {"day": "tuesday", "start": "09:00", "end": "17:00", "is_open": true},
    {"day": "wednesday", "start": "09:00", "end": "17:00", "is_open": true},
    {"day": "thursday", "start": "09:00", "end": "17:00", "is_open": true},
    {"day": "friday", "start": "09:00", "end": "17:00", "is_open": true},
    {"day": "saturday", "start": "10:00", "end": "14:00", "is_open": false},
    {"day": "sunday", "start": "10:00", "end": "14:00", "is_open": false}
  ]'::jsonb,
  notification_preferences jsonb DEFAULT '{
    "email_notifications": true,
    "sms_notifications": true,
    "appointment_reminders": true,
    "reminder_time": "24h",
    "system_updates": true
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS if not already enabled
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_settings' 
    AND policyname = 'Allow authenticated users to view settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to view settings"
      ON clinic_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_settings' 
    AND policyname = 'Allow authenticated users to update settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to update settings"
      ON clinic_settings
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create updated_at trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_clinic_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_clinic_settings_updated_at
      BEFORE UPDATE ON clinic_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;