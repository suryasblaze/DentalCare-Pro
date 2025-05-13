-- Modify the inventory_log table for enhanced purchase and batch tracking

-- Add purchase_order_item_id column
ALTER TABLE public.inventory_log
ADD COLUMN IF NOT EXISTS purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_log.purchase_order_item_id IS 'Link to the purchase order item that triggered this stock change, if applicable.';

-- Add inventory_item_batch_id column
ALTER TABLE public.inventory_log
ADD COLUMN IF NOT EXISTS inventory_item_batch_id UUID REFERENCES public.inventory_item_batches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_log.inventory_item_batch_id IS 'Link to the specific inventory item batch affected by this transaction, if applicable.';

-- The 'notes' column should already exist from the 20250425181000_create_inventory_log_table.sql migration.
-- If it was somehow missed, this would add it:
-- ALTER TABLE public.inventory_log ADD COLUMN IF NOT EXISTS notes TEXT;
-- COMMENT ON COLUMN public.inventory_log.notes IS 'Additional notes or reasons for the inventory transaction.';

-- Update the inventory_change_type ENUM to include batch-specific types
-- Ensure these values don't already exist before adding to avoid errors if run multiple times.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BATCH_STOCK_IN' AND enumtypid = 'inventory_change_type'::regtype) THEN
        ALTER TYPE inventory_change_type ADD VALUE 'BATCH_STOCK_IN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BATCH_STOCK_OUT' AND enumtypid = 'inventory_change_type'::regtype) THEN
        ALTER TYPE inventory_change_type ADD VALUE 'BATCH_STOCK_OUT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BATCH_ADJUSTMENT' AND enumtypid = 'inventory_change_type'::regtype) THEN
        ALTER TYPE inventory_change_type ADD VALUE 'BATCH_ADJUSTMENT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXPIRED' AND enumtypid = 'inventory_change_type'::regtype) THEN
        ALTER TYPE inventory_change_type ADD VALUE 'EXPIRED';
    END IF;
    -- The original 'UPDATE', 'ADJUSTMENT', 'STOCK_IN', 'STOCK_OUT' from the ENUM definition are different from the CHECK constraint values.
    -- We are keeping the ENUM and adding to it.
    -- If 'STOCK_IN' from the ENUM is meant to be the same as 'STOCK_IN' from the later CHECK constraint, ensure consistency.
    -- The original ENUM had 'add' and 'use' which might map to 'STOCK_IN' and 'STOCK_OUT'.
    -- For now, we are just adding the new batch types to the existing ENUM.
END$$;

-- Update comments if necessary
COMMENT ON COLUMN public.inventory_log.change_type IS 'Type of inventory transaction. Valid values are defined in the inventory_change_type ENUM.';
