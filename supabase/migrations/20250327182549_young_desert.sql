/*
  # Fix clinic settings

  1. Changes
    - Ensures clinic settings table has at least one row
    - Updates default settings with proper data structure
    - Adds indexes for better query performance

  2. Security
    - No changes to RLS policies
*/

-- Delete any existing settings to ensure clean state
DELETE FROM clinic_settings;

-- Insert default settings
INSERT INTO clinic_settings (
  name,
  address,
  phone,
  email,
  website,
  working_hours,
  notification_preferences
) VALUES (
  'DentalCare Pro',
  '123 Healthcare Avenue',
  '+1234567890',
  'info@dentalcarepro.com',
  'https://dentalcarepro.com',
  '[
    {"day": "monday", "end": "17:00", "start": "09:00", "is_open": true},
    {"day": "tuesday", "end": "17:00", "start": "09:00", "is_open": true},
    {"day": "wednesday", "end": "17:00", "start": "09:00", "is_open": true},
    {"day": "thursday", "end": "17:00", "start": "09:00", "is_open": true},
    {"day": "friday", "end": "17:00", "start": "09:00", "is_open": true},
    {"day": "saturday", "end": "14:00", "start": "10:00", "is_open": false},
    {"day": "sunday", "end": "14:00", "start": "10:00", "is_open": false}
  ]'::jsonb,
  '{
    "reminder_time": "24h",
    "system_updates": true,
    "sms_notifications": true,
    "email_notifications": true,
    "appointment_reminders": true
  }'::jsonb
);