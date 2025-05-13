CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT AS $$
DECLARE
    current_year_text TEXT;
    last_po_number_for_year TEXT;
    next_sequence_value INTEGER;
    new_po_number_text TEXT;
BEGIN
    current_year_text := TO_CHAR(NOW(), 'YYYY');

    -- Find the highest sequence number for the current year
    SELECT MAX(SUBSTRING(po_number FROM 'PO-\d{4}-(\d{4})$')::INTEGER)
    INTO next_sequence_value
    FROM public.purchase_orders
    WHERE po_number LIKE 'PO-' || current_year_text || '-%';

    IF next_sequence_value IS NULL THEN
        -- This is the first PO for the current year
        next_sequence_value := 1;
    ELSE
        -- Increment the found sequence number
        next_sequence_value := next_sequence_value + 1;
    END IF;

    -- Format the new PO number
    new_po_number_text := 'PO-' || current_year_text || '-' || LPAD(next_sequence_value::TEXT, 4, '0');

    RETURN new_po_number_text;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_po_number() IS 'Generates a new unique purchase order number in the format PO-YYYY-NNNN. Example: PO-2024-0001.';

-- Grant execute permission to authenticated users, or specific roles if preferred
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO authenticated;
-- If you want to restrict it to specific roles, you might do:
-- GRANT EXECUTE ON FUNCTION public.generate_po_number() TO inventory_manager_role, admin_role;
-- Ensure these roles exist. For now, 'authenticated' is a general approach.
