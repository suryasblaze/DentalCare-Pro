-- Create the notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Assuming notifications are tied to authenticated users
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    link_url TEXT, -- Optional URL to navigate to when notification is clicked
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to view their own notifications
CREATE POLICY "Allow users to view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to mark their own notifications as read (update is_read)
CREATE POLICY "Allow users to mark their own notifications as read"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Inserting notifications might be handled by backend functions or triggers
-- depending on the application logic. For now, no INSERT policy is defined for users directly.

-- Enable real-time updates for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
