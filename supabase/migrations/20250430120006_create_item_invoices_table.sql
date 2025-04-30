-- Create the item_invoices table
CREATE TABLE item_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  invoice_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE item_invoices ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own item invoices
CREATE POLICY "Users can see their own item invoices"
ON item_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = uploaded_by);

-- Create policy to allow users to insert item invoices
CREATE POLICY "Users can insert item invoices"
ON item_invoices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);
