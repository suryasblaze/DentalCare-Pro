-- View for Monthly Spend on Purchase Orders
CREATE OR REPLACE VIEW public.vw_monthly_spend AS
SELECT
    TO_CHAR(po.order_date, 'YYYY-MM') AS purchase_month,
    SUM(po.total_amount) AS total_monthly_spend,
    COUNT(po.id) AS number_of_orders
FROM
    public.purchase_orders po
WHERE
    po.status NOT IN ('Pending', 'Cancelled') -- Only count confirmed/completed orders
GROUP BY
    TO_CHAR(po.order_date, 'YYYY-MM')
ORDER BY
    purchase_month DESC;

COMMENT ON VIEW public.vw_monthly_spend IS 'Aggregates total spending on purchase orders by month and year.';

-- View for Supplier Performance (Spending)
CREATE OR REPLACE VIEW public.vw_supplier_performance AS
SELECT
    s.id AS supplier_id,
    s.name AS supplier_name,
    SUM(po.total_amount) AS total_spent_with_supplier,
    COUNT(po.id) AS number_of_orders_from_supplier,
    AVG(po.total_amount) AS average_order_value
FROM
    public.purchase_orders po
JOIN
    public.suppliers s ON po.supplier_id = s.id
WHERE
    po.status NOT IN ('Pending', 'Cancelled')
GROUP BY
    s.id, s.name
ORDER BY
    total_spent_with_supplier DESC;

COMMENT ON VIEW public.vw_supplier_performance IS 'Aggregates spending and order counts per supplier.';

-- View for Item Purchase History (including batch details)
CREATE OR REPLACE VIEW public.vw_item_purchase_history AS
SELECT
    ii.id AS inventory_item_id,
    ii.item_name,
    poi.id AS purchase_order_item_id,
    po.id AS purchase_order_id,
    po.po_number,
    po.order_date,
    s.name AS supplier_name,
    poi.quantity_ordered,
    poi.unit_price AS price_on_po_item, -- Price as per the PO line item
    iib.id AS batch_id,
    iib.batch_number,
    iib.quantity_on_hand AS batch_quantity_received, -- This is current quantity, might differ from initial receipt if consumed
    iib.purchase_price_at_receipt AS batch_purchase_price, -- Actual price paid for this batch
    iib.received_date AS batch_received_date,
    iib.expiry_date AS batch_expiry_date
FROM
    public.inventory_items ii
JOIN
    public.purchase_order_items poi ON ii.id = poi.inventory_item_id
JOIN
    public.purchase_orders po ON poi.purchase_order_id = po.id
LEFT JOIN
    public.suppliers s ON po.supplier_id = s.id
LEFT JOIN
    public.inventory_item_batches iib ON poi.id = iib.purchase_order_item_id AND ii.id = iib.inventory_item_id
WHERE
    po.status NOT IN ('Pending', 'Cancelled') -- Consider only processed orders
ORDER BY
    ii.item_name, po.order_date DESC, iib.received_date DESC;

COMMENT ON VIEW public.vw_item_purchase_history IS 'Shows detailed purchase history for each inventory item, including PO details and batch information where applicable.';

-- Grant select permissions on these views
GRANT SELECT ON public.vw_monthly_spend TO authenticated;
GRANT SELECT ON public.vw_supplier_performance TO authenticated;
GRANT SELECT ON public.vw_item_purchase_history TO authenticated;
