ALTER TABLE public.inventory_adjustment_requests
ADD COLUMN approval_token TEXT UNIQUE, -- Stores a unique token for email approval link (consider hashing it)
ADD COLUMN approval_token_expires_at TIMESTAMPTZ; -- Token expiry

COMMENT ON COLUMN public.inventory_adjustment_requests.approval_token IS 'Unique token for one-time approval via email link. Should be stored hashed if sensitive.';
COMMENT ON COLUMN public.inventory_adjustment_requests.approval_token_expires_at IS 'Timestamp when the approval token expires.';

-- Optional: If you want to ensure only one pending request per item can have an active token
-- CREATE UNIQUE INDEX idx_adj_req_pending_item_token ON public.inventory_adjustment_requests (inventory_item_id, approval_token)
-- WHERE status = 'pending' AND approval_token IS NOT NULL;
