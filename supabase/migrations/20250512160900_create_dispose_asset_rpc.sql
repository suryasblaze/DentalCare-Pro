-- Function to dispose of an asset, update its status and disposal fields, and log the event.
CREATE OR REPLACE FUNCTION public.dispose_asset(
    p_asset_id UUID,
    p_disposed_by_user_id UUID,
    p_disposal_date DATE,
    p_disposal_reason TEXT,
    p_salvage_value NUMERIC DEFAULT 0.00,
    p_disposal_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asset_current_status TEXT;
BEGIN
    -- Check current asset status
    SELECT status INTO v_asset_current_status
    FROM public.assets
    WHERE id = p_asset_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Asset with ID % not found.', p_asset_id;
    END IF;

    IF v_asset_current_status = 'Disposed' OR v_asset_current_status = 'Retired' THEN
        RAISE EXCEPTION 'Asset ID % is already disposed or retired.', p_asset_id;
    END IF;

    -- Validate disposal reason (basic check, can be enhanced with ENUMs or a separate reasons table)
    IF p_disposal_reason IS NULL OR trim(p_disposal_reason) = '' THEN
        RAISE EXCEPTION 'Disposal reason cannot be empty.';
    END IF;
    
    IF p_disposal_date IS NULL THEN
        RAISE EXCEPTION 'Disposal date cannot be empty.';
    END IF;


    -- Update the asset record
    UPDATE public.assets
    SET
        status = 'Disposed', -- Or 'Retired' based on preference
        disposal_date = p_disposal_date,
        disposal_reason = p_disposal_reason,
        disposal_notes = p_disposal_notes,
        salvage_value = p_salvage_value,
        next_maintenance_due_date = NULL, -- Clear upcoming maintenance
        last_serviced_date = last_serviced_date -- Keep last serviced date for history
    WHERE id = p_asset_id;

    -- Insert into asset_disposal_log
    INSERT INTO public.asset_disposal_log (
        asset_id,
        disposed_by_user_id,
        disposal_date,
        disposal_reason,
        disposal_notes,
        salvage_value
        -- disposal_recorded_at and created_at have defaults
    )
    VALUES (
        p_asset_id,
        p_disposed_by_user_id,
        p_disposal_date,
        p_disposal_reason,
        p_disposal_notes,
        p_salvage_value
    );

    -- Optional: Logic to cancel/archive any pending reminders for this asset
    -- e.g., DELETE FROM public.reminders WHERE asset_id = p_asset_id AND status = 'pending';
    -- Or update notifications related to this asset if any are active.

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.dispose_asset(UUID, UUID, DATE, TEXT, NUMERIC, TEXT) TO authenticated;

COMMENT ON FUNCTION public.dispose_asset(UUID, UUID, DATE, TEXT, NUMERIC, TEXT) IS
'Marks an asset as disposed, updates its status and disposal fields, clears next maintenance, and logs the event in asset_disposal_log.';
