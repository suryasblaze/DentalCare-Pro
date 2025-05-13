-- Update the handle_receive_po_item_batch function to also update the total quantity in inventory_items

CREATE OR REPLACE FUNCTION public.handle_receive_po_item_batch(
    p_po_item_id UUID,
    p_quantity_received INTEGER,
    p_batch_number TEXT,
    p_expiry_date DATE,
    p_purchase_price NUMERIC,
    p_received_by_user_id UUID
)
RETURNS UUID AS $$ -- Returns the ID of the created/updated inventory_item_batch
DECLARE
    v_inventory_item_id UUID;
    v_supplier_id UUID;
    v_existing_batch_id UUID;
    v_batch_id_to_log UUID;
    v_current_po_id UUID;
BEGIN
    -- Get inventory_item_id, supplier_id, and purchase_order_id from the purchase order item and its PO
    SELECT poi.inventory_item_id, po.supplier_id, poi.purchase_order_id
    INTO v_inventory_item_id, v_supplier_id, v_current_po_id
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.id = p_po_item_id;

    IF v_inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'Purchase order item not found, or inventory item ID/supplier ID is null for PO Item ID: %', p_po_item_id;
    END IF;

    -- Check for an existing batch based on inventory_item_id and batch_number
    SELECT id
    INTO v_existing_batch_id
    FROM public.inventory_item_batches
    WHERE inventory_item_id = v_inventory_item_id
      AND batch_number = p_batch_number;

    IF v_existing_batch_id IS NOT NULL THEN
        -- Update existing batch
        UPDATE public.inventory_item_batches
        SET
            quantity_on_hand = quantity_on_hand + p_quantity_received,
            expiry_date = (
                CASE
                    WHEN inventory_item_batches.expiry_date IS NULL THEN p_expiry_date
                    WHEN p_expiry_date IS NULL THEN inventory_item_batches.expiry_date
                    ELSE LEAST(inventory_item_batches.expiry_date, p_expiry_date)
                END
            ), -- Keep the earliest expiry date
            purchase_price_at_receipt = p_purchase_price, -- Update to the latest purchase price
            received_date = CURRENT_DATE, -- Update to the current date for this receipt
            supplier_id = v_supplier_id, -- Update to the supplier from the current PO
            purchase_order_item_id = p_po_item_id -- Link to the current PO item
        WHERE id = v_existing_batch_id;
        v_batch_id_to_log := v_existing_batch_id;
    ELSE
        -- Create a new inventory item batch record
        INSERT INTO public.inventory_item_batches (
            inventory_item_id,
            batch_number,
            quantity_on_hand,
            expiry_date,
            purchase_price_at_receipt,
            received_date,
            supplier_id,
            purchase_order_item_id
        )
        VALUES (
            v_inventory_item_id,
            p_batch_number,
            p_quantity_received,
            p_expiry_date,
            p_purchase_price,
            CURRENT_DATE,
            v_supplier_id,
            p_po_item_id
        )
        RETURNING id INTO v_batch_id_to_log;
    END IF;

    -- *** ADDED: Update the total quantity in inventory_items ***
    UPDATE public.inventory_items
    SET quantity = quantity + p_quantity_received
    WHERE id = v_inventory_item_id;

    -- Update quantity_received on the purchase_order_items table
    -- This will trigger the update_purchase_order_status function
    UPDATE public.purchase_order_items
    SET quantity_received = COALESCE(quantity_received, 0) + p_quantity_received
    WHERE id = p_po_item_id;
    
    -- Log the transaction in inventory_log
    INSERT INTO public.inventory_log (
        inventory_item_id,
        inventory_item_batch_id,
        quantity_change,
        user_id,
        change_type,
        purchase_order_item_id,
        notes,
        item_id -- Ensure item_id is included if required by type/policy
    )
    VALUES (
        v_inventory_item_id,
        v_batch_id_to_log,
        p_quantity_received, -- This is the change in quantity for this transaction
        p_received_by_user_id,
        'BATCH_STOCK_IN',
        p_po_item_id,
        'Received ' || p_quantity_received || ' of batch ' || COALESCE(p_batch_number, 'N/A') || ' via PO item ' || p_po_item_id::TEXT,
        null -- Set item_id to null explicitly if not applicable here
    );
    
    RETURN v_batch_id_to_log;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_receive_po_item_batch(UUID, INTEGER, TEXT, DATE, NUMERIC, UUID)
IS 'Handles receiving items for a PO: creates/updates batch, updates PO item received qty, updates total item qty, and logs transaction. p_received_by_user_id is the ID of the user performing the action.';

-- Ensure the function is executable by authenticated users
GRANT EXECUTE ON FUNCTION public.handle_receive_po_item_batch(UUID, INTEGER, TEXT, DATE, NUMERIC, UUID) TO authenticated;
