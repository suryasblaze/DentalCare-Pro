-- Function to mark an asset as serviced, update dates, and log the event.
CREATE OR REPLACE FUNCTION public.mark_asset_as_serviced(
    p_asset_id UUID,
    p_serviced_by_user_id UUID,
    p_service_notes TEXT DEFAULT NULL,
    p_maintenance_cost NUMERIC DEFAULT 0.00,
    p_invoice_document_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Allows the function to run with the permissions of the definer, not the caller.
AS $$
DECLARE
    v_asset public.assets%ROWTYPE;
    v_previous_last_serviced_date DATE;
    v_previous_next_maintenance_due_date DATE;
    v_new_last_serviced_date DATE;
    v_new_next_maintenance_due_date DATE;
    v_maintenance_interval_months INTEGER;
BEGIN
    -- Get current asset details
    SELECT * INTO v_asset
    FROM public.assets
    WHERE id = p_asset_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Asset with ID % not found.', p_asset_id;
    END IF;

    -- Store previous dates for logging
    v_previous_last_serviced_date := v_asset.last_serviced_date;
    v_previous_next_maintenance_due_date := v_asset.next_maintenance_due_date;

    -- Set new last serviced date to today
    v_new_last_serviced_date := current_date;

    -- Calculate new next maintenance due date
    v_maintenance_interval_months := v_asset.maintenance_interval_months;

    IF v_maintenance_interval_months IS NULL OR v_maintenance_interval_months <= 0 THEN
        RAISE EXCEPTION 'Maintenance interval for asset ID % is not configured or invalid. Please set a valid maintenance_interval_months for the asset.', p_asset_id;
    END IF;

    v_new_next_maintenance_due_date := v_new_last_serviced_date + (v_maintenance_interval_months || ' months')::interval;

    -- Update the asset record
    UPDATE public.assets
    SET
        last_serviced_date = v_new_last_serviced_date,
        next_maintenance_due_date = v_new_next_maintenance_due_date,
        status = 'Active' -- Or based on other logic, assuming it's active after service
    WHERE id = p_asset_id;

    -- Insert into maintenance_log
    INSERT INTO public.maintenance_log (
        asset_id,
        serviced_by_user_id,
        notes,
        previous_last_serviced_date,
        previous_next_maintenance_due_date,
        new_last_serviced_date,
        new_next_maintenance_due_date,
        maintenance_cost,
        invoice_document_id
        -- serviced_at and created_at have defaults
    )
    VALUES (
        p_asset_id,
        p_serviced_by_user_id,
        p_service_notes,
        v_previous_last_serviced_date,
        v_previous_next_maintenance_due_date,
        v_new_last_serviced_date,
        v_new_next_maintenance_due_date,
        p_maintenance_cost,
        p_invoice_document_id
    );

END;
$$;

-- Grant execute permission on the function to authenticated users or specific roles
-- This allows your frontend/backend to call this RPC.
-- Note: Signature changed, so update grant statement if it was more specific before.
GRANT EXECUTE ON FUNCTION public.mark_asset_as_serviced(UUID, UUID, TEXT, NUMERIC, UUID) TO authenticated;
-- Or to a specific role: GRANT EXECUTE ON FUNCTION public.mark_asset_as_serviced(UUID, UUID, TEXT, NUMERIC, UUID) TO service_technician_role;

COMMENT ON FUNCTION public.mark_asset_as_serviced(UUID, UUID, TEXT, NUMERIC, UUID) IS
'Marks an asset as serviced, updates its maintenance dates, status to Active, logs the event with cost and invoice link in maintenance_log. Requires maintenance_interval_months to be set on the asset.';
