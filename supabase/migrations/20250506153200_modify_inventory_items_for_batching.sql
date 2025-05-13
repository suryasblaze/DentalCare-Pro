-- Modify the inventory_items table for batch tracking

-- Add the is_batched column
ALTER TABLE public.inventory_items
ADD COLUMN is_batched BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.inventory_items.is_batched IS 'Indicates if the item is managed in batches (true) or as a single stock unit (false).';

-- Drop columns that will now be managed at the batch level for batched items
-- Ensure these operations are safe for your existing data. Consider backing up first.
ALTER TABLE public.inventory_items
DROP COLUMN IF EXISTS expiry_date;

ALTER TABLE public.inventory_items
DROP COLUMN IF EXISTS purchase_price;

-- Note: The 'quantity' column on inventory_items for batched items
-- will need to be kept in sync with the sum of quantities from its active batches.
-- This typically requires application logic or database triggers (to be implemented later).
-- The 'supplier_info' column can remain for a default/primary supplier if desired.

-- Re-apply comments if necessary, or add new ones for clarity
COMMENT ON TABLE public.inventory_items IS 'Stores master information for inventory items. Quantity for batched items is a sum of its batches.';
