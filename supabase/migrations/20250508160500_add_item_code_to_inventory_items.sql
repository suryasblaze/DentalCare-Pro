ALTER TABLE public.inventory_items
ADD COLUMN item_code TEXT;

-- Add a unique constraint to ensure item codes are distinct
ALTER TABLE public.inventory_items
ADD CONSTRAINT inventory_items_item_code_unique UNIQUE (item_code);

-- Add an index for faster lookups on item_code
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_code ON public.inventory_items(item_code);

COMMENT ON COLUMN public.inventory_items.item_code IS 'User-defined unique code (e.g., SKU) for the inventory item for easy identification and tracking.';

-- Note: Existing items will have NULL item_code.
-- You might want to populate these manually or via a script after this migration.
-- For new items, the application UI should prompt for this code.
