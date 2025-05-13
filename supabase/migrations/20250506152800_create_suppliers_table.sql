-- Create the suppliers table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for frequently queried columns
CREATE INDEX idx_suppliers_name ON public.suppliers(name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- Allow authenticated users to view all suppliers (adjust if more restrictive access is needed)
CREATE POLICY "Allow authenticated users to view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

-- Allow users with a specific role (e.g., 'admin' or 'inventory_manager') to insert suppliers
-- Assuming you have a 'role' column in your 'profiles' table and a function to get the current user's role.
-- You might need to adjust this based on your actual role management.
CREATE POLICY "Allow admin/manager to insert suppliers"
ON public.suppliers
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Allow admin/manager to update suppliers
CREATE POLICY "Allow admin/manager to update suppliers"
ON public.suppliers
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Allow admin/manager to delete suppliers
CREATE POLICY "Allow admin/manager to delete suppliers"
ON public.suppliers
FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at' on suppliers table
CREATE TRIGGER on_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.handle_supplier_updated_at();

-- Add comments
COMMENT ON TABLE public.suppliers IS 'Stores information about suppliers for purchase orders and inventory items.';
COMMENT ON COLUMN public.suppliers.name IS 'The legal name of the supplier company.';
COMMENT ON COLUMN public.suppliers.contact_person IS 'Primary contact person at the supplier.';
