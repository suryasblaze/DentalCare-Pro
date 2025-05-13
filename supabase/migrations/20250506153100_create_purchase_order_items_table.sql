-- Create the purchase_order_items table
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    description TEXT, -- Item name/description at the time of PO creation for historical accuracy
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0 AND quantity_received <= quantity_ordered),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED, -- Calculated
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_po_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_inventory_item_id ON public.purchase_order_items(inventory_item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view items of POs they can view
CREATE POLICY "Allow users to view items of accessible purchase orders"
ON public.purchase_order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_id
        -- RLS on purchase_orders table will implicitly apply here
    )
);

-- Allow admin/manager to insert items into POs they can manage
CREATE POLICY "Allow admin/manager to insert purchase order items"
ON public.purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') AND
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_id AND po.status = 'Pending' -- Typically items added when PO is pending
        -- Further checks if only creator of PO can add items initially
    )
);

-- Allow admin/manager to update items (e.g., quantity_received)
CREATE POLICY "Allow admin/manager to update purchase order items"
ON public.purchase_order_items
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') AND
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_id AND po.status IN ('Ordered', 'Partially Received') -- Items usually received when PO is ordered/partially received
    )
);

-- Allow admin/manager to delete items from pending POs
CREATE POLICY "Allow admin/manager to delete items from pending purchase orders"
ON public.purchase_order_items
FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') AND
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_id AND po.status = 'Pending'
    )
);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_purchase_order_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at'
CREATE TRIGGER on_purchase_order_items_updated_at
BEFORE UPDATE ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_purchase_order_item_updated_at();

-- Comments
COMMENT ON TABLE public.purchase_order_items IS 'Stores individual line items for each purchase order.';
COMMENT ON COLUMN public.purchase_order_items.description IS 'Item name/description at PO creation, for historical record keeping.';
COMMENT ON COLUMN public.purchase_order_items.quantity_ordered IS 'Quantity of the item ordered.';
COMMENT ON COLUMN public.purchase_order_items.quantity_received IS 'Quantity of the item actually received.';
COMMENT ON COLUMN public.purchase_order_items.unit_price IS 'Price per unit of the item at the time of order.';
COMMENT ON COLUMN public.purchase_order_items.subtotal IS 'Calculated subtotal for this line item (quantity_ordered * unit_price).';
