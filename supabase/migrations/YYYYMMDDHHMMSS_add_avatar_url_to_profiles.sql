-- Add avatar_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN avatar_url TEXT NULL;

-- Optional: Add a comment describing the column
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL pointing to the user''s profile picture in storage.';
