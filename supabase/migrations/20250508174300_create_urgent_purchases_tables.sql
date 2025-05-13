-- supabase/migrations/20250508174300_create_urgent_purchases_tables.sql

-- Function to check if the current user is an admin based on their profile
CREATE OR REPLACE FUNCTION public.is_claims_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_claims_admin() IS 'Checks if the currently authenticated user has the admin role in their profile.';


CREATE TABLE urgent_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slip_image_path TEXT,
    slip_filename TEXT,
    invoice_delivery_date DATE,
    status TEXT NOT NULL CHECK (status IN ('Pending Review', 'Auto-Confirmed', 'Manually Confirmed', 'Rejected', 'ProcessingError')),
    confidence_score NUMERIC(3, 2), -- e.g., 0.95 for 95%
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE urgent_purchases IS 'Stores records of urgent purchases made without a formal PO, typically from a slip or direct invoice.';
COMMENT ON COLUMN urgent_purchases.slip_image_path IS 'Path to the uploaded slip/invoice image in Supabase Storage.';
COMMENT ON COLUMN urgent_purchases.status IS 'Status of the urgent purchase processing.';
COMMENT ON COLUMN urgent_purchases.confidence_score IS 'Overall confidence score (0.00-1.00) from OCR/AI parsing.';

CREATE TABLE urgent_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    urgent_purchase_id UUID NOT NULL REFERENCES urgent_purchases(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    slip_text TEXT,
    matched_item_name TEXT NOT NULL, -- Denormalized for easier display, actual item name from inventory_items
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    batch_number TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE urgent_purchase_items IS 'Stores individual items associated with an urgent purchase.';
COMMENT ON COLUMN urgent_purchase_items.urgent_purchase_id IS 'Link to the parent urgent_purchases record.';
COMMENT ON COLUMN urgent_purchase_items.inventory_item_id IS 'Link to the master inventory item.';
COMMENT ON COLUMN urgent_purchase_items.slip_text IS 'Original text for the item as extracted from the slip.';
COMMENT ON COLUMN urgent_purchase_items.matched_item_name IS 'Name of the inventory item matched by AI/fuzzy search.';
COMMENT ON COLUMN urgent_purchase_items.batch_number IS 'Batch number of the received item, if applicable.';
COMMENT ON COLUMN urgent_purchase_items.expiry_date IS 'Expiry date of the received item, if applicable.';

-- Enable RLS for the new tables
ALTER TABLE urgent_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_purchase_items ENABLE ROW LEVEL SECURITY;

-- Policies for urgent_purchases
CREATE POLICY "Allow authenticated users to manage their own urgent purchases"
ON urgent_purchases
FOR ALL
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow admin users to manage all urgent purchases"
ON urgent_purchases
FOR ALL
USING (public.is_claims_admin()) -- Assuming is_claims_admin() function exists and checks for an 'admin' role
WITH CHECK (public.is_claims_admin());


-- Policies for urgent_purchase_items
-- Users can manage items belonging to urgent purchases they created
CREATE POLICY "Allow users to manage items of their urgent purchases"
ON urgent_purchase_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM urgent_purchases up
    WHERE up.id = urgent_purchase_id AND up.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM urgent_purchases up
    WHERE up.id = urgent_purchase_id AND up.created_by = auth.uid()
  )
);

CREATE POLICY "Allow admin users to manage all urgent purchase items"
ON urgent_purchase_items
FOR ALL
USING (public.is_claims_admin())
WITH CHECK (public.is_claims_admin());


-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  _new RECORD;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at_urgent_purchases
BEFORE UPDATE ON public.urgent_purchases
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER handle_updated_at_urgent_purchase_items
BEFORE UPDATE ON public.urgent_purchase_items
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Consider adding indexes for frequently queried columns, e.g.,
-- CREATE INDEX idx_urgent_purchases_status ON urgent_purchases(status);
-- CREATE INDEX idx_urgent_purchases_created_by ON urgent_purchases(created_by);
-- CREATE INDEX idx_urgent_purchase_items_urgent_purchase_id ON urgent_purchase_items(urgent_purchase_id);
-- CREATE INDEX idx_urgent_purchase_items_inventory_item_id ON urgent_purchase_items(inventory_item_id);
