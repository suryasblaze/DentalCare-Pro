-- supabase/migrations/20250503112000_create_invoices_table.sql

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL, -- Optional: Link to item if uploaded during creation
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for faster lookups
CREATE INDEX idx_invoices_uploaded_at ON invoices(uploaded_at);
CREATE INDEX idx_invoices_inventory_item_id ON invoices(inventory_item_id);
CREATE INDEX idx_invoices_uploaded_by_user_id ON invoices(uploaded_by_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to manage their own invoices
-- Adjust these policies based on your exact security requirements (e.g., admin roles)

-- Allow users to view all invoices (adjust if needed)
CREATE POLICY "Allow authenticated users to view invoices"
ON invoices
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow users to insert their own invoices
CREATE POLICY "Allow users to insert their own invoices"
ON invoices
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by_user_id);

-- Allow users to delete their own invoices (optional)
CREATE POLICY "Allow users to delete their own invoices"
ON invoices
FOR DELETE
USING (auth.uid() = uploaded_by_user_id);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update 'updated_at'
CREATE TRIGGER on_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment on table
COMMENT ON TABLE public.invoices IS 'Stores information about uploaded invoice files.';
