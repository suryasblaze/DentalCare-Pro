/*
  # Add default clinic settings

  1. Changes
    - Inserts default clinic settings if none exist
    - Ensures working hours and notification preferences are properly configured
    - Sets up basic clinic information

  2. Security
    - No changes to RLS policies
*/

-- First check if settings already exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clinic_settings LIMIT 1) THEN
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
      '[{"day": "monday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "tuesday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "wednesday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "thursday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "friday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "saturday", "end": "14:00", "start": "10:00", "is_open": false}, {"day": "sunday", "end": "14:00", "start": "10:00", "is_open": false}]'::jsonb,
      '{"reminder_time": "24h", "system_updates": true, "sms_notifications": true, "email_notifications": true, "appointment_reminders": true}'::jsonb
    );
  END IF;
END $$;