/*
  # Create Storage Bucket for Medical Records

  1. New Storage Bucket
    - Create a dedicated 'medical-records' bucket for storing patient files
    - Configure bucket for proper security and access

  2. Security
    - Enable appropriate RLS policies for bucket
*/

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('medical-records', 'medical-records', true, false, 50000000, '{image/png,image/jpeg,image/jpg,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- Create security policies directly on the objects table
DO $$
BEGIN
  -- Insert policy - Allow authenticated users to insert objects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to upload medical record files'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload medical record files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'medical-records');
  END IF;

  -- Select policy - Allow authenticated users to view objects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to view medical record files'
  ) THEN
    CREATE POLICY "Allow authenticated users to view medical record files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'medical-records');
  END IF;

  -- Update policy - Allow authenticated users to update objects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to update medical record files'
  ) THEN
    CREATE POLICY "Allow authenticated users to update medical record files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'medical-records');
  END IF;

  -- Delete policy - Allow authenticated users to delete objects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to delete medical record files'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete medical record files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'medical-records');
  END IF;
END $$;