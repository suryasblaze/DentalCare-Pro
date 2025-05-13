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
    v_new_batch_id UUID;
BEGIN
    -- Get inventory_item_id and supplier_id from the purchase order item and its PO
    SELECT poi.inventory_item_id, po.supplier_id
    INTO v_inventory_item_id, v_supplier_id
    FROM public.purchase_order_items poi
    JOIN public.purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.id = p_po_item_id;

    IF v_inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'Purchase order item not found or inventory item ID is null for PO Item ID: %', p_po_item_id;
    END IF;

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
        CURRENT_DATE, -- Or a specific received date if passed as parameter
        v_supplier_id,
        p_po_item_id
    )
    RETURNING id INTO v_new_batch_id;

    -- Corrected INSERT statement for inventory_log
    INSERT INTO public.inventory_log (
        inventory_item_id,         -- Was item_id
        inventory_item_batch_id,
        quantity_change,           -- Was old_quantity, new_quantity
        user_id,                   -- Was updated_by
        change_type,               -- Was transaction_type
        purchase_order_item_id,
        notes
    )
    VALUES (
        v_inventory_item_id,
        v_new_batch_id,
        p_quantity_received,       -- This is the change in quantity
        p_received_by_user_id,
        'BATCH_STOCK_IN',          -- This type should exist due to 20250506...modify... migration
        p_po_item_id,
        'Received batch ' || COALESCE(p_batch_number, 'N/A') || ' via PO item ' || p_po_item_id::TEXT
    );
    
    RETURN v_new_batch_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_receive_po_item_batch(UUID, INTEGER, TEXT, DATE, NUMERIC, UUID)
IS 'Handles the creation of an inventory item batch when a purchase order item is received. Logs the transaction. p_received_by_user_id is the ID of the user performing the action.';

GRANT EXECUTE ON FUNCTION public.handle_receive_po_item_batch(UUID, INTEGER, TEXT, DATE, NUMERIC, UUID) TO authenticated;

-- Function and Trigger to Update PO Status
-- This part of the original migration file remains unchanged as it was not related to the error.
CREATE OR REPLACE FUNCTION public.update_purchase_order_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_ordered INTEGER;
    v_total_received INTEGER;
    v_po_id UUID;
    v_current_po_status TEXT;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_po_id := NEW.purchase_order_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_po_id := OLD.purchase_order_id;
    END IF;

    SELECT status INTO v_current_po_status FROM public.purchase_orders WHERE id = v_po_id;

    IF v_current_po_status = 'Cancelled' THEN
        RETURN NULL; 
    END IF;
    
    SELECT
        COALESCE(SUM(quantity_ordered), 0),
        COALESCE(SUM(quantity_received), 0)
    INTO v_total_ordered, v_total_received
    FROM public.purchase_order_items
    WHERE purchase_order_id = v_po_id;

    IF v_total_received = 0 AND v_total_ordered > 0 AND v_current_po_status <> 'Pending' THEN
        UPDATE public.purchase_orders
        SET status = 'Ordered' 
        WHERE id = v_po_id;
    ELSIF v_total_received > 0 AND v_total_received < v_total_ordered THEN
        UPDATE public.purchase_orders
        SET status = 'Partially Received'
        WHERE id = v_po_id;
    ELSIF v_total_received > 0 AND v_total_received >= v_total_ordered THEN 
        UPDATE public.purchase_orders
        SET status = 'Received'
        WHERE id = v_po_id;
    END IF;

    RETURN NULL; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_po_status_after_item_change
AFTER INSERT OR UPDATE OF quantity_received OR DELETE ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_purchase_order_status();

COMMENT ON FUNCTION public.update_purchase_order_status() IS 'Updates the status of a purchase order based on the total ordered vs. total received quantities of its items. Does not alter "Cancelled" or "Pending" statuses directly unless items are added/received.';
