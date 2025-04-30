-- supabase/migrations/20250425173300_add_photo_url_to_inventory_and_assets.sql

-- Add photo_url column to inventory_items table
ALTER TABLE public.inventory_items
ADD COLUMN photo_url text;

COMMENT ON COLUMN public.inventory_items.photo_url IS 'URL of the item photo stored in Supabase Storage';

-- Add photo_url column to assets table
ALTER TABLE public.assets
ADD COLUMN photo_url text;

COMMENT ON COLUMN public.assets.photo_url IS 'URL of the asset photo stored in Supabase Storage';
