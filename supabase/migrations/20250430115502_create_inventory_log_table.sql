-- Create the inventory_log table
CREATE TABLE inventory_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  old_quantity INTEGER,
  new_quantity INTEGER NOT NULL,
  updated_by UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  transaction_type TEXT CHECK (transaction_type IN ('UPDATE', 'ADJUSTMENT', 'STOCK_IN', 'STOCK_OUT'))
);

-- Enable RLS
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own inventory logs
CREATE POLICY "Users can see their own inventory logs"
ON inventory_log
FOR SELECT
TO authenticated
USING (auth.uid() = updated_by);

-- Create policy to allow users to insert inventory logs
CREATE POLICY "Users can insert inventory logs"
ON inventory_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = updated_by);
