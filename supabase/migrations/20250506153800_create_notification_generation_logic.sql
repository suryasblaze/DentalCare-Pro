-- Function to check low stock and notify
CREATE OR REPLACE FUNCTION public.check_low_stock_and_notify(p_inventory_item_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item_name TEXT;
    v_current_quantity INTEGER;
    v_threshold INTEGER;
    v_is_batched BOOLEAN;
    v_notification_message TEXT;
    v_admin_user_id UUID;
BEGIN
    SELECT item_name, quantity, low_stock_threshold, is_batched
    INTO v_item_name, v_current_quantity, v_threshold, v_is_batched
    FROM public.inventory_items
    WHERE id = p_inventory_item_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Inventory item not found for ID: %', p_inventory_item_id;
        RETURN;
    END IF;

    IF v_is_batched THEN
        SELECT COALESCE(SUM(quantity_on_hand), 0)
        INTO v_current_quantity
        FROM public.inventory_item_batches
        WHERE inventory_item_id = p_inventory_item_id AND quantity_on_hand > 0;
    END IF;

    IF v_current_quantity <= v_threshold THEN
        PERFORM 1
        FROM public.notifications
        WHERE related_entity_id = p_inventory_item_id
          AND notification_type = 'LOW_STOCK'
          AND is_read = FALSE
          AND created_at > NOW() - INTERVAL '1 day';

        IF NOT FOUND THEN
            v_notification_message := 'Low stock warning: Item "' || v_item_name || '" (ID: ' || p_inventory_item_id::TEXT || ') has reached ' || v_current_quantity || ' units, at or below the threshold of ' || v_threshold || '.';

            FOR v_admin_user_id IN
                SELECT id FROM public.profiles WHERE role IN ('admin', 'inventory_manager')
            LOOP
                INSERT INTO public.notifications (user_id, message, notification_type, related_entity_id, related_entity_type, link_url)
                VALUES (
                    v_admin_user_id,
                    v_notification_message,
                    'LOW_STOCK',
                    p_inventory_item_id,
                    'inventory_item',
                    '/inventory/' || p_inventory_item_id::TEXT
                );
            END LOOP;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_low_stock_and_notify(UUID) IS 'Checks if an inventory item is below its low stock threshold and creates a notification. For batched items, sums active batch quantities.';
GRANT EXECUTE ON FUNCTION public.check_low_stock_and_notify(UUID) TO authenticated;

-- Trigger for Low Stock (on inventory_item_batches)
CREATE OR REPLACE FUNCTION public.trigger_check_low_stock_after_batch_change()
RETURNS TRIGGER AS $$
DECLARE
    v_item_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_item_id := OLD.inventory_item_id;
    ELSE
        v_item_id := NEW.inventory_item_id;
    END IF;

    PERFORM public.check_low_stock_and_notify(v_item_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_low_stock_after_batch_change
AFTER INSERT OR UPDATE OF quantity_on_hand OR DELETE ON public.inventory_item_batches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_low_stock_after_batch_change();

COMMENT ON TRIGGER trigger_low_stock_after_batch_change ON public.inventory_item_batches IS 'Calls check_low_stock_and_notify after a batch quantity changes.';

-- Function to generate expiry warnings (callable by scheduler)
CREATE OR REPLACE FUNCTION public.generate_expiry_warnings(p_warning_days_threshold INTEGER DEFAULT 30)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_notification_message TEXT;
    v_admin_user_id UUID;
BEGIN
    FOR r IN
        SELECT
            iib.id AS batch_id,
            iib.batch_number,
            iib.expiry_date,
            iib.quantity_on_hand,
            ii.id AS item_id,
            ii.item_name
        FROM public.inventory_item_batches iib
        JOIN public.inventory_items ii ON iib.inventory_item_id = ii.id
        WHERE iib.expiry_date IS NOT NULL
          AND iib.quantity_on_hand > 0
          AND iib.expiry_date <= (CURRENT_DATE + MAKE_INTERVAL(days => p_warning_days_threshold))
          AND iib.expiry_date >= CURRENT_DATE -- Only warn for items not yet expired
    LOOP
        -- Check if a recent unread expiry warning for this batch already exists
        PERFORM 1
        FROM public.notifications
        WHERE related_entity_id = r.batch_id
          AND notification_type = 'EXPIRY_WARNING_BATCH'
          AND is_read = FALSE
          AND created_at > NOW() - INTERVAL '7 days'; -- Avoid re-notifying too frequently for same batch

        IF NOT FOUND THEN
            v_notification_message := 'Expiry warning: Batch "' || COALESCE(r.batch_number, 'N/A') || '" of item "' || r.item_name || '" (Item ID: ' || r.item_id::TEXT || ', Batch ID: ' || r.batch_id::TEXT || ') with ' || r.quantity_on_hand || ' units is expiring on ' || r.expiry_date::TEXT || '.';

            FOR v_admin_user_id IN
                SELECT id FROM public.profiles WHERE role IN ('admin', 'inventory_manager')
            LOOP
                INSERT INTO public.notifications (user_id, message, notification_type, related_entity_id, related_entity_type, link_url)
                VALUES (
                    v_admin_user_id,
                    v_notification_message,
                    'EXPIRY_WARNING_BATCH',
                    r.batch_id,
                    'inventory_item_batch',
                    '/inventory/' || r.item_id::TEXT || '/batch/' || r.batch_id::TEXT -- Example link
                );
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_expiry_warnings(INTEGER) IS 'Generates notifications for inventory item batches that are expiring within the specified number of days (default 30).';
GRANT EXECUTE ON FUNCTION public.generate_expiry_warnings(INTEGER) TO authenticated; -- Or a specific service role for schedulers
