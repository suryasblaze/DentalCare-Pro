-- Function to update purchase_order total_amount
CREATE OR REPLACE FUNCTION public.update_purchase_order_total_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_po_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_po_id := OLD.purchase_order_id;
  ELSE
    v_po_id := NEW.purchase_order_id;
  END IF;

  UPDATE public.purchase_orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM public.purchase_order_items
    WHERE purchase_order_id = v_po_id
  )
  WHERE id = v_po_id;

  RETURN NULL; -- Result is ignored since this is an AFTER trigger
END;
$$;

-- Trigger to call the function after insert, update, or delete on purchase_order_items
CREATE TRIGGER trigger_update_purchase_order_total
AFTER INSERT OR UPDATE OF quantity_ordered, unit_price OR DELETE ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_purchase_order_total_amount();

COMMENT ON FUNCTION public.update_purchase_order_total_amount() IS 'Updates the total_amount on the purchase_orders table based on sum of its items subtotals.';
COMMENT ON TRIGGER trigger_update_purchase_order_total ON public.purchase_order_items IS 'Automatically updates purchase_orders.total_amount when purchase_order_items change.';

-- Optional: Backfill existing purchase orders' total_amount
-- This should be run once manually if needed.
-- UPDATE public.purchase_orders po
-- SET total_amount = (
--   SELECT COALESCE(SUM(poi.subtotal), 0)
--   FROM public.purchase_order_items poi
--   WHERE poi.purchase_order_id = po.id
-- )
-- WHERE po.total_amount IS NULL OR po.total_amount = 0; -- Or some other condition to identify those needing update
