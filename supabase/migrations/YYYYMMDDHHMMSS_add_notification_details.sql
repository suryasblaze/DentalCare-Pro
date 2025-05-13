-- supabase/migrations/YYYYMMDDHHMMSS_add_notification_details.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250506120500

-- Add columns to track item/asset and notification type
ALTER TABLE public.notifications
ADD COLUMN item_id UUID NULL, -- Can be inventory_item_id or asset_id
ADD COLUMN item_type TEXT NULL CHECK (item_type IN ('inventory', 'asset')), -- Type of item referenced
ADD COLUMN notification_type TEXT NULL; -- e.g., 'low_stock', 'expiry_soon', 'maintenance_due', 'warranty_expiry'

-- Optional: Add comments
COMMENT ON COLUMN public.notifications.item_id IS 'Reference to the inventory item or asset ID related to the notification.';
COMMENT ON COLUMN public.notifications.item_type IS 'Indicates whether the item_id refers to ''inventory'' or ''asset''.';
COMMENT ON COLUMN public.notifications.notification_type IS 'Specific type of alert (e.g., low_stock, expiry_soon).';

-- Optional: Add indexes if needed for querying
CREATE INDEX idx_notifications_item_id ON public.notifications(item_id);
CREATE INDEX idx_notifications_notification_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_item_type ON public.notifications(item_type);

-- Index for the combination used in the check
CREATE INDEX idx_notifications_check ON public.notifications(user_id, item_id, item_type, notification_type, created_at);
