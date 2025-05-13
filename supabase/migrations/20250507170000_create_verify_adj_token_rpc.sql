-- Function to verify an approval token and fetch request details
CREATE OR REPLACE FUNCTION public.verify_adjustment_approval_token(
    p_request_id uuid,
    p_raw_token text
)
RETURNS TABLE (
    id uuid,
    inventory_item_id uuid,
    inventory_item_batch_id uuid,
    quantity_to_decrease integer,
    reason public.inventory_adjustment_request_reason,
    notes text,
    photo_url text,
    status public.inventory_adjustment_request_status,
    requested_by_user_id uuid,
    requested_at timestamptz,
    item_name text, -- Joined from inventory_items
    requester_name text -- Joined from profiles
)
LANGUAGE plpgsql
SECURITY INVOKER -- Can be invoker as it's a read operation, or definer if more complex checks needed
AS $$
DECLARE
    v_request_record public.inventory_adjustment_requests;
BEGIN
    -- Fetch the request, checking token and expiry
    -- If storing hashed tokens, you'd use: approval_token = crypt(p_raw_token, approval_token)
    SELECT *
    INTO v_request_record
    FROM public.inventory_adjustment_requests
    WHERE public.inventory_adjustment_requests.id = p_request_id
      AND public.inventory_adjustment_requests.approval_token = p_raw_token
      AND public.inventory_adjustment_requests.status = 'pending'
      AND public.inventory_adjustment_requests.approval_token_expires_at > timezone('utc'::text, now());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired approval token, or request not found/pending.';
    END IF;

    -- Return the joined data
    RETURN QUERY
    SELECT
        req.id,
        req.inventory_item_id,
        req.inventory_item_batch_id,
        req.quantity_to_decrease,
        req.reason,
        req.notes,
        req.photo_url,
        req.status,
        req.requested_by_user_id,
        req.requested_at,
        inv.item_name,
        prof.full_name AS requester_name
    FROM public.inventory_adjustment_requests req
    LEFT JOIN public.inventory_items inv ON inv.id = req.inventory_item_id
    LEFT JOIN public.profiles prof ON prof.id = req.requested_by_user_id
    WHERE req.id = v_request_record.id;

END;
$$;

COMMENT ON FUNCTION public.verify_adjustment_approval_token(uuid, text) IS 'Verifies an approval token for an inventory adjustment request and returns its details if valid and pending.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_adjustment_approval_token(uuid, text) TO authenticated;
