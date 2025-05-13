-- Modify the invoices table to link to purchase orders

-- Add the purchase_order_id column
ALTER TABLE public.invoices
ADD COLUMN purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

-- Add an index for the new foreign key
CREATE INDEX idx_invoices_purchase_order_id ON public.invoices(purchase_order_id);

-- Add a comment for the new column
COMMENT ON COLUMN public.invoices.purchase_order_id IS 'Link to the purchase order this invoice is associated with, if any.';

-- Update RLS policies if needed to consider the new column or its implications.
-- For now, existing policies might be sufficient, but review based on access patterns.
-- Example: If users should only see invoices for POs they can access:
/*
CREATE POLICY "Allow users to view invoices for their accessible POs"
ON public.invoices
FOR SELECT
TO authenticated
USING (
    purchase_order_id IS NULL OR -- Allow viewing invoices not linked to any PO
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = invoices.purchase_order_id
        -- RLS on purchase_orders table will implicitly apply here
    )
);
*/
-- The above policy is an example and might need refinement based on exact requirements.
-- For now, we'll stick to adding the column and index.
