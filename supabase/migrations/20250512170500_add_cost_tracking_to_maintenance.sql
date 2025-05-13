-- Add maintenance_cost and invoice_document_id to maintenance_log table
ALTER TABLE public.maintenance_log
ADD COLUMN maintenance_cost NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN invoice_document_id UUID NULLABLE REFERENCES public.asset_documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.maintenance_log.maintenance_cost IS 'Cost incurred for this specific maintenance event.';
COMMENT ON COLUMN public.maintenance_log.invoice_document_id IS 'Link to an uploaded invoice document for this maintenance event.';

-- Also, ensure the RPC function `mark_asset_as_serviced` can accept and store these.
-- The RPC function `mark_asset_as_serviced` needs to be updated.
-- This will be handled in a separate step if the function signature changes.
-- For now, this migration only alters the table.
-- The existing RPC `mark_asset_as_serviced` does not handle these new fields.
-- We will need to update it.
