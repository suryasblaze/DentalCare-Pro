-- Function to process an approved inventory adjustment request
CREATE OR REPLACE FUNCTION public.process_approved_adjustment(
    p_request_id uuid,
    p_reviewer_user_id uuid,
    p_reviewer_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Run as the approving user (admin/manager)
AS $$
DECLARE
    v_request record;
    v_new_quantity integer;
BEGIN
    -- 1. Fetch the pending request and lock it
    SELECT *
    INTO v_request
    FROM public.inventory_adjustment_requests
    WHERE id = p_request_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending adjustment request with ID % not found.', p_request_id;
    END IF;

    -- 2. Perform the adjustment by calling the core adjustment function
    --    We pass the negative quantity and the reason from the request.
    --    The user ID logged will be the *approver's* ID.
    SELECT public.adjust_inventory_item_quantity(
        p_inventory_item_id       := v_request.inventory_item_id,
        p_quantity_change         := -ABS(v_request.quantity_to_decrease), -- Ensure it's negative
        p_change_type             := v_request.reason::public.inventory_change_type, -- Cast reason enum to change_type enum
        p_user_id                 := p_reviewer_user_id,
        p_notes                   := 'Approved Adjustment Request ID: ' || v_request.id || '. Original Notes: ' || v_request.notes || '. Reviewer Notes: ' || COALESCE(p_reviewer_notes, 'N/A'),
        p_inventory_item_batch_id := v_request.inventory_item_batch_id
    )
    INTO v_new_quantity; -- Capture the returned new quantity if needed, though not used here

    -- 3. Update the request status to 'approved'
    UPDATE public.inventory_adjustment_requests
    SET status = 'approved',
        reviewed_by_user_id = p_reviewer_user_id,
        reviewed_at = timezone('utc'::text, now()),
        reviewer_notes = p_reviewer_notes,
        updated_at = timezone('utc'::text, now()) -- Trigger should also handle this
    WHERE id = p_request_id;

END;
$$;

COMMENT ON FUNCTION public.process_approved_adjustment(uuid, uuid, text) IS 'Processes an approved inventory adjustment request: adjusts stock, logs the change, and updates the request status.';

-- Grant execute permission to relevant roles (e.g., admin, inventory_manager)
-- Adjust roles as necessary
GRANT EXECUTE ON FUNCTION public.process_approved_adjustment(uuid, uuid, text) TO authenticated;
-- You might want to restrict this further based on roles if needed,
-- but the RLS policies on the tables provide the primary control.
