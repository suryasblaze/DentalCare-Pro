-- Create ENUM type for adjustment request status
CREATE TYPE public.inventory_adjustment_request_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- Create ENUM type for adjustment request reason
CREATE TYPE public.inventory_adjustment_request_reason AS ENUM (
    'Expired',
    'Damaged',
    'Lost',
    'Stock Count Correction',
    'Used', -- Added for stock takes
    'Other'
);

-- Create the inventory_adjustment_requests table
CREATE TABLE public.inventory_adjustment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    inventory_item_batch_id UUID REFERENCES public.inventory_item_batches(id) ON DELETE SET NULL, -- Optional batch link
    quantity_to_decrease INTEGER NOT NULL CHECK (quantity_to_decrease > 0),
    reason public.inventory_adjustment_request_reason NOT NULL,
    notes TEXT NOT NULL, -- Make notes mandatory for requests
    photo_url TEXT, -- URL to the uploaded photo proof in Supabase Storage
    status public.inventory_adjustment_request_status NOT NULL DEFAULT 'pending',
    requested_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
    requested_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_by_user_id UUID REFERENCES public.profiles(id), -- User who approved/rejected
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT, -- Optional notes from the reviewer
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_adj_req_inventory_item_id ON public.inventory_adjustment_requests(inventory_item_id);
CREATE INDEX idx_adj_req_status ON public.inventory_adjustment_requests(status);
CREATE INDEX idx_adj_req_requested_by ON public.inventory_adjustment_requests(requested_by_user_id);
CREATE INDEX idx_adj_req_reviewed_by ON public.inventory_adjustment_requests(reviewed_by_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inventory_adjustment_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Examples - Adjust roles as needed)
-- Allow users to create requests for themselves
CREATE POLICY "Allow users to create their own adjustment requests"
ON public.inventory_adjustment_requests
FOR INSERT
TO authenticated
WITH CHECK ( requested_by_user_id = auth.uid() );

-- Allow users to view their own requests
CREATE POLICY "Allow users to view their own adjustment requests"
ON public.inventory_adjustment_requests
FOR SELECT
TO authenticated
USING ( requested_by_user_id = auth.uid() );

-- Allow admin/manager to view all requests
CREATE POLICY "Allow admin/manager to view all adjustment requests"
ON public.inventory_adjustment_requests
FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') );

-- Allow admin/manager to update requests (approve/reject)
CREATE POLICY "Allow admin/manager to update adjustment requests"
ON public.inventory_adjustment_requests
FOR UPDATE
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') )
WITH CHECK ( reviewed_by_user_id = auth.uid() ); -- Ensure the reviewer is the one updating

-- Allow admin/manager to delete (perhaps only rejected/old requests - use with caution)
CREATE POLICY "Allow admin/manager to delete adjustment requests"
ON public.inventory_adjustment_requests
FOR DELETE
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager') );


-- Trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_inventory_adjustment_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_inventory_adjustment_requests_updated_at
BEFORE UPDATE ON public.inventory_adjustment_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_adjustment_request_updated_at();

-- Comments
COMMENT ON TABLE public.inventory_adjustment_requests IS 'Stores requests for manual inventory adjustments requiring review/approval.';
COMMENT ON COLUMN public.inventory_adjustment_requests.quantity_to_decrease IS 'The positive quantity by which the stock should be decreased.';
COMMENT ON COLUMN public.inventory_adjustment_requests.photo_url IS 'Link to uploaded photo evidence for the adjustment.';
COMMENT ON COLUMN public.inventory_adjustment_requests.status IS 'Workflow status of the adjustment request.';
