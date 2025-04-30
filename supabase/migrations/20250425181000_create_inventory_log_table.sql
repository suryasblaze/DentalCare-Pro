-- supabase/migrations/20250425181000_create_inventory_log_table.sql

CREATE TYPE inventory_change_type AS ENUM (
    'add',             -- Adding new stock
    'use',             -- Using stock (e.g., during treatment)
    'dispose_expired', -- Disposing of expired stock
    'dispose_other',   -- Disposing for other reasons (damage, etc.)
    'initial_stock',   -- Setting initial stock level
    'adjustment'       -- Manual stock count adjustments
);

CREATE TABLE inventory_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL, -- Keep log even if item deleted
    quantity_change integer NOT NULL CHECK (quantity_change != 0), -- Must be non-zero change
    change_type inventory_change_type NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: Who made the change
    notes text -- Optional context for the change
);

-- Add Row Level Security (RLS) policies
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- Example: Allow authenticated users full access (adjust based on specific roles/needs later)
CREATE POLICY "Allow authenticated users full access to inventory logs"
ON inventory_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for frequently queried columns
CREATE INDEX idx_inventory_log_item_id ON inventory_log(inventory_item_id);
CREATE INDEX idx_inventory_log_change_type ON inventory_log(change_type);
CREATE INDEX idx_inventory_log_created_at ON inventory_log(created_at);
CREATE INDEX idx_inventory_log_user_id ON inventory_log(user_id);

-- Add comments for clarity
COMMENT ON TABLE inventory_log IS 'Tracks changes to inventory item quantities over time.';
COMMENT ON COLUMN inventory_log.inventory_item_id IS 'The inventory item that was changed.';
COMMENT ON COLUMN inventory_log.quantity_change IS 'The amount the quantity changed by (positive for additions, negative for removals).';
COMMENT ON COLUMN inventory_log.change_type IS 'The reason for the inventory change.';
COMMENT ON COLUMN inventory_log.user_id IS 'The user who initiated the change, if applicable.';
COMMENT ON COLUMN inventory_log.notes IS 'Optional notes providing more context about the change.';
