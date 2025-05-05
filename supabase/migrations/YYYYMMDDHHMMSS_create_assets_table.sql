-- supabase/migrations/YYYYMMDDHHMMSS_create_assets_table.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250425170500

CREATE TABLE assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    asset_name text NOT NULL,
    category text NOT NULL CHECK (category IN ('Equipment & Tools', 'Furniture', 'IT', 'Other')), -- Define asset categories
    serial_number text UNIQUE, -- Serial numbers should ideally be unique if they exist
    location text, -- e.g., Room/Branch
    purchase_date date,
    purchase_price numeric(10, 2), -- Optional purchase price
    warranty_expiry_date date,
    last_serviced_date date,
    next_maintenance_due_date date,
    status text NOT NULL CHECK (status IN ('Active', 'Under Maintenance', 'Retired', 'Disposed')), -- Define asset statuses
    supplier_info text, -- Optional supplier info
    service_document_url text, -- URL/path to attached documents (e.g., Supabase Storage)
    barcode_value text UNIQUE -- Optional barcode/QR code value, should be unique if used
    -- Consider adding user_id or clinic_id for multi-tenancy if needed
    -- user_id uuid REFERENCES auth.users(id)
);

-- Add Row Level Security (RLS) policies
-- Adjust these based on your application's security requirements
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Example: Allow authenticated users full access (adjust as needed)
CREATE POLICY "Allow authenticated users full access to assets"
ON assets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Add indexes for frequently queried columns
CREATE INDEX idx_asset_name ON assets(asset_name);
CREATE INDEX idx_asset_category ON assets(category);
CREATE INDEX idx_asset_serial_number ON assets(serial_number);
CREATE INDEX idx_asset_location ON assets(location);
CREATE INDEX idx_asset_status ON assets(status);
CREATE INDEX idx_asset_next_maintenance ON assets(next_maintenance_due_date);
CREATE INDEX idx_asset_barcode_value ON assets(barcode_value);

-- Add comments to columns for clarity in Supabase UI
COMMENT ON COLUMN assets.asset_name IS 'Name or description of the asset';
COMMENT ON COLUMN assets.category IS 'Type of asset (e.g., Equipment & Tools, Furniture, IT)';
COMMENT ON COLUMN assets.serial_number IS 'Unique manufacturer serial number';
COMMENT ON COLUMN assets.location IS 'Physical location of the asset (e.g., Room 101, Main Branch)';
COMMENT ON COLUMN assets.purchase_date IS 'Date the asset was acquired';
COMMENT ON COLUMN assets.purchase_price IS 'Cost of acquiring the asset';
COMMENT ON COLUMN assets.warranty_expiry_date IS 'Date the manufacturer warranty expires';
COMMENT ON COLUMN assets.last_serviced_date IS 'Date of the last maintenance or service';
COMMENT ON COLUMN assets.next_maintenance_due_date IS 'Date when the next scheduled maintenance is due';
COMMENT ON COLUMN assets.status IS 'Current operational status of the asset';
COMMENT ON COLUMN assets.supplier_info IS 'Information about the supplier or vendor';
COMMENT ON COLUMN assets.service_document_url IS 'Link to related service documents or invoices (e.g., Supabase Storage URL)';
COMMENT ON COLUMN assets.barcode_value IS 'Value stored in the asset''s barcode or QR code';
