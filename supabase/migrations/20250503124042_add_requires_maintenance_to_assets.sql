-- Add requires_maintenance column to assets table
ALTER TABLE public.assets
ADD COLUMN requires_maintenance BOOLEAN DEFAULT FALSE;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN public.assets.requires_maintenance IS 'Indicates if the asset currently requires maintenance';
