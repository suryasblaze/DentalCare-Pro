-- File: supabase/migrations/20250513123700_update_mark_asset_as_serviced_rpc.sql

-- Recreate the function to use maintenance_interval_value and maintenance_interval_unit
CREATE OR REPLACE FUNCTION public.mark_asset_as_serviced(
    p_asset_id UUID,
    p_serviced_by_user_id UUID,
    p_service_notes TEXT DEFAULT NULL,
    p_maintenance_cost NUMERIC DEFAULT 0.00,
    p_invoice_document_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asset public.assets%ROWTYPE;
    v_previous_last_serviced_date DATE;
    v_previous_next_maintenance_due_date DATE;
    v_new_last_serviced_date DATE;
    v_new_next_maintenance_due_date DATE;
    v_interval_value INTEGER;
    v_interval_unit TEXT;
    v_calculated_interval INTERVAL;
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

    -- Get interval details from the asset record
    v_interval_value := v_asset.maintenance_interval_value; -- Updated column name
    v_interval_unit := v_asset.maintenance_interval_unit;   -- New column

    IF v_interval_value IS NULL OR v_interval_value <= 0 OR v_interval_unit IS NULL THEN
        RAISE EXCEPTION 'Maintenance interval for asset ID % is not configured or invalid. Please set a valid maintenance_interval_value and maintenance_interval_unit for the asset.', p_asset_id;
    END IF;

    -- Calculate the interval based on unit
    IF v_interval_unit = 'days' THEN
        v_calculated_interval := (v_interval_value || ' days')::interval;
    ELSIF v_interval_unit = 'weeks' THEN
        v_calculated_interval := (v_interval_value * 7 || ' days')::interval; -- Convert weeks to days for interval
    ELSIF v_interval_unit = 'months' THEN
        v_calculated_interval := (v_interval_value || ' months')::interval;
    ELSIF v_interval_unit = 'years' THEN
        v_calculated_interval := (v_interval_value || ' years')::interval;
    ELSE
        RAISE EXCEPTION 'Invalid maintenance_interval_unit: % for asset ID %.', v_interval_unit, p_asset_id;
    END IF;

    v_new_next_maintenance_due_date := v_new_last_serviced_date + v_calculated_interval;

    -- Update the asset record
    UPDATE public.assets
    SET
        last_serviced_date = v_new_last_serviced_date,
        next_maintenance_due_date = v_new_next_maintenance_due_date,
        status = 'Active' -- Or based on other logic
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

-- Ensure grant statement is still valid (signature has not changed)
GRANT EXECUTE ON FUNCTION public.mark_asset_as_serviced(UUID, UUID, TEXT, NUMERIC, UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_asset_as_serviced(UUID, UUID, TEXT, NUMERIC, UUID) IS
'Marks an asset as serviced, updates its maintenance dates using maintenance_interval_value and maintenance_interval_unit, logs the event with cost and invoice link. Requires interval fields to be set on the asset.';
