-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN role TEXT CHECK (role IN ('admin', 'doctor')) DEFAULT 'doctor';

-- Add comment to the new column
COMMENT ON COLUMN public.profiles.role IS 'User role (e.g., admin, doctor)';

-- Update the handle_new_user function to include a default role
-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function to set the default role ('doctor')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role) -- Add role here
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'doctor' -- Set default role for new users
  );
  RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Optional: Update existing profiles without a role to 'doctor'
-- Run this manually if needed after applying the migration:
-- UPDATE public.profiles SET role = 'doctor' WHERE role IS NULL;
