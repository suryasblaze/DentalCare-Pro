-- Add updated_at column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

COMMENT ON COLUMN public.inventory_items.updated_at IS 'Timestamp of the last update to the inventory item record.';

-- Optional: Create a trigger function to automatically update it on every update
CREATE OR REPLACE FUNCTION public.handle_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_inventory_items_trigger_set_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_items_updated_at();

-- Optional: Backfill existing rows if you want their updated_at to match created_at initially
-- Ensure this runs only once or is guarded if re-runnable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'inventory_items'
    AND column_name = 'created_at'
  ) THEN
    UPDATE public.inventory_items
    SET updated_at = created_at
    WHERE updated_at IS NULL;
  END IF;
END $$;
