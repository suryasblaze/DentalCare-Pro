-- supabase/migrations/20250425151500_create_inventory_items_table.sql

CREATE TABLE inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_name text NOT NULL,
    category text NOT NULL CHECK (category IN ('Medicines', 'Tools', 'Consumables')), -- Enforce categories
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    expiry_date date, -- Nullable for items without expiry
    supplier_info text,
    purchase_price numeric(10, 2), -- Precision 10, Scale 2 for currency
    low_stock_threshold integer NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0) -- Threshold for "Low Stock"
    -- Add user_id or clinic_id later if needed for multi-tenancy
);

-- Add Row Level Security (RLS) policies - Assuming authenticated users can manage inventory
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to inventory"
ON inventory_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Add indexes for frequently queried columns
CREATE INDEX idx_inventory_item_name ON inventory_items(item_name);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_expiry_date ON inventory_items(expiry_date);
