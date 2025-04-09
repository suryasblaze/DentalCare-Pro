-- Add the user_id column to the patients table
ALTER TABLE public.patients
ADD COLUMN user_id UUID;

-- Add a foreign key constraint linking patients.user_id to auth.users.id
-- Allow the user_id to be NULL (if a patient doesn't have a login)
-- Use ON DELETE SET NULL: If the auth.users record is deleted, set patients.user_id to NULL
ALTER TABLE public.patients
ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id)
REFERENCES auth.users (id) ON DELETE SET NULL;

-- Add an index for performance
CREATE INDEX idx_patients_user_id ON public.patients(user_id);
