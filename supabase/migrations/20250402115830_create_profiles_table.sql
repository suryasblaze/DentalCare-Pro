-- Create profiles table to store user-specific data
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    mobile_number text,
    address text,
    date_of_birth date,
    gender text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to columns
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';
COMMENT ON COLUMN public.profiles.id IS 'References the internal Supabase auth user.';
COMMENT ON COLUMN public.profiles.first_name IS 'User''s first name.';
COMMENT ON COLUMN public.profiles.last_name IS 'User''s last name.';
COMMENT ON COLUMN public.profiles.mobile_number IS 'User''s mobile phone number.';
COMMENT ON COLUMN public.profiles.address IS 'User''s physical address.';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User''s date of birth.';
COMMENT ON COLUMN public.profiles.gender IS 'User''s gender identity.';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp of the last profile update.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view their own profile
CREATE POLICY "Allow individual user access to own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Allow individual user update access to own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Optional: Function to automatically create a profile entry when a new user signs up
-- This helps ensure every authenticated user has a corresponding profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name', -- Attempt to get from metadata if provided during signup
    new.raw_user_meta_data ->> 'last_name'  -- Attempt to get from metadata if provided during signup
  );
  RETURN new;
END;
$$;

-- Trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
