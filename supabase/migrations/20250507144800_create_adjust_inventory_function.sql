-- Function to adjust inventory quantity and log the change
CREATE OR REPLACE FUNCTION public.adjust_inventory_item_quantity(
    p_inventory_item_id uuid,
    p_quantity_change integer, -- Positive for increase, negative for decrease
    p_change_type public.inventory_change_type, -- Use the existing ENUM type
    p_user_id uuid,
    p_notes text DEFAULT NULL,
    p_inventory_item_batch_id uuid DEFAULT NULL -- Optional: Specify batch for adjustment
)
RETURNS integer -- Returns the new quantity_on_hand for the item
LANGUAGE plpgsql
SECURITY INVOKER -- Run as the calling user, RLS policies apply
AS $$
DECLARE
    v_current_item_quantity integer;
    v_new_item_quantity integer;
    v_current_batch_quantity integer;
    v_new_batch_quantity integer;
BEGIN
    -- Validate change type
    IF p_change_type IS NULL THEN
        RAISE EXCEPTION 'Change type cannot be null.';
    END IF;

    -- Lock the inventory item row to prevent race conditions
    SELECT quantity INTO v_current_item_quantity FROM public.inventory_items WHERE id = p_inventory_item_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item with ID % not found.', p_inventory_item_id;
    END IF;

    v_new_item_quantity := v_current_item_quantity + p_quantity_change;

    -- Check for sufficient stock if decreasing quantity
    IF v_new_item_quantity < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for item ID %. Current quantity: %, Requested change: %', p_inventory_item_id, v_current_item_quantity, p_quantity_change;
    END IF;

    -- Adjust batch quantity if batch ID is provided
    IF p_inventory_item_batch_id IS NOT NULL THEN
        SELECT quantity_on_hand INTO v_current_batch_quantity FROM public.inventory_item_batches WHERE id = p_inventory_item_batch_id AND inventory_item_id = p_inventory_item_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inventory item batch with ID % not found for item ID %.', p_inventory_item_batch_id, p_inventory_item_id;
        END IF;

        v_new_batch_quantity := v_current_batch_quantity + p_quantity_change;

        IF v_new_batch_quantity < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for batch ID %. Current quantity: %, Requested change: %', p_inventory_item_batch_id, v_current_batch_quantity, p_quantity_change;
        END IF;

        -- Update batch quantity
        UPDATE public.inventory_item_batches
        SET quantity_on_hand = v_new_batch_quantity,
            updated_at = now()
        WHERE id = p_inventory_item_batch_id;
    END IF;

    -- Update main inventory item quantity
    UPDATE public.inventory_items
    SET quantity = v_new_item_quantity,
        updated_at = now()
    WHERE id = p_inventory_item_id;

    -- Insert into inventory_log
    INSERT INTO public.inventory_log (
        inventory_item_id,
        quantity_change,
        change_type,
        user_id,
        inventory_item_batch_id,
        notes
        -- purchase_order_item_id will be null for adjustments/usage
    )
    VALUES (
        p_inventory_item_id,
        p_quantity_change,
        p_change_type,
        p_user_id,
        p_inventory_item_batch_id,
        p_notes
    );

    RETURN v_new_item_quantity;

END;
$$;

COMMENT ON FUNCTION public.adjust_inventory_item_quantity(uuid, integer, public.inventory_change_type, uuid, text, uuid) IS 'Adjusts the quantity for an inventory item and optionally a specific batch, logging the transaction. Returns the new master item quantity.';
