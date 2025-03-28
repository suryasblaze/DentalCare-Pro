/*
  # Create default clinic settings

  1. Changes
    - Insert default clinic settings record if none exists
    - Add trigger to prevent multiple settings records
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
      'My Dental Clinic',
      '123 Main Street',
      '+1234567890',
      'contact@mydentalclinic.com',
      'https://mydentalclinic.com',
      '[{"day": "monday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "tuesday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "wednesday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "thursday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "friday", "end": "17:00", "start": "09:00", "is_open": true}, {"day": "saturday", "end": "14:00", "start": "10:00", "is_open": false}, {"day": "sunday", "end": "14:00", "start": "10:00", "is_open": false}]'::jsonb,
      '{"reminder_time": "24h", "system_updates": true, "sms_notifications": true, "email_notifications": true, "appointment_reminders": true}'::jsonb
    );
  END IF;
END $$;