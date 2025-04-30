-- Create the inventory_notifications table
CREATE TABLE inventory_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE inventory_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own notifications
CREATE POLICY "Users can see their own inventory notifications"
ON inventory_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow users to insert notifications for themselves
CREATE POLICY "Users can insert their own inventory notifications"
ON inventory_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own notifications
CREATE POLICY "Users can update their own inventory notifications"
ON inventory_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
