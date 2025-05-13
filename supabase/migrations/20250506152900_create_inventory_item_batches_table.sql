-- Create the inventory_item_batches table
CREATE TABLE public.inventory_item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    batch_number TEXT, -- Optional, but recommended for external reference
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    expiry_date DATE, -- Nullable, but should be NOT NULL for items that expire (e.g., Medicines)
    purchase_price_at_receipt NUMERIC(10, 2) NOT NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL, -- Optional: if batch directly linked to a supplier
    purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL, -- Optional: if batch came from a PO
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_inventory_item_batches_item_id ON public.inventory_item_batches(inventory_item_id);
CREATE INDEX idx_inventory_item_batches_expiry_date ON public.inventory_item_batches(expiry_date);
CREATE INDEX idx_inventory_item_batches_batch_number ON public.inventory_item_batches(batch_number);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory_item_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view batch details (e.g., when viewing inventory item details)
CREATE POLICY "Allow authenticated users to view inventory item batches"
ON public.inventory_item_batches
FOR SELECT
TO authenticated
USING (true);

-- Allow admin/manager to insert inventory item batches
CREATE POLICY "Allow admin/manager to insert inventory item batches"
ON public.inventory_item_batches
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Allow admin/manager to update inventory item batches
CREATE POLICY "Allow admin/manager to update inventory item batches"
ON public.inventory_item_batches
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Allow admin/manager to delete inventory item batches (use with caution)
CREATE POLICY "Allow admin/manager to delete inventory item batches"
ON public.inventory_item_batches
FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_inventory_item_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at'
CREATE TRIGGER on_inventory_item_batches_updated_at
BEFORE UPDATE ON public.inventory_item_batches
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_item_batch_updated_at();

-- Comments
COMMENT ON TABLE public.inventory_item_batches IS 'Stores individual batches of inventory items, including quantity, expiry date, and purchase price.';
COMMENT ON COLUMN public.inventory_item_batches.inventory_item_id IS 'Link to the parent inventory item.';
COMMENT ON COLUMN public.inventory_item_batches.batch_number IS 'Supplier or internal batch number/identifier.';
COMMENT ON COLUMN public.inventory_item_batches.quantity_on_hand IS 'Current quantity available in this batch.';
COMMENT ON COLUMN public.inventory_item_batches.expiry_date IS 'Expiry date of this specific batch.';
COMMENT ON COLUMN public.inventory_item_batches.purchase_price_at_receipt IS 'Cost price for items in this batch when received.';
COMMENT ON COLUMN public.inventory_item_batches.received_date IS 'Date this batch was received into stock.';
COMMENT ON COLUMN public.inventory_item_batches.purchase_order_item_id IS 'Link to the purchase order item if this batch was received via a PO.';
