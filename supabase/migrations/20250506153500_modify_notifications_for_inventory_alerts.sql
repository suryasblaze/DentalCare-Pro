-- Modify the notifications table for more specific alert types and entity linking

-- Add notification_type column
ALTER TABLE public.notifications
ADD COLUMN notification_type TEXT; -- Consider making NOT NULL if all notifications will have a type

COMMENT ON COLUMN public.notifications.notification_type IS 'Type of notification (e.g., LOW_STOCK, EXPIRY_WARNING_BATCH, PO_RECEIVED, PO_STATUS_UPDATE).';

-- Add related_entity_id column
ALTER TABLE public.notifications
ADD COLUMN related_entity_id UUID;

COMMENT ON COLUMN public.notifications.related_entity_id IS 'ID of the entity this notification relates to (e.g., inventory_item_id, inventory_item_batch_id, purchase_order_id).';

-- Add related_entity_type column
ALTER TABLE public.notifications
ADD COLUMN related_entity_type TEXT;

COMMENT ON COLUMN public.notifications.related_entity_type IS 'Type of the entity this notification relates to (e.g., inventory_item, inventory_item_batch, purchase_order).';

-- Add indexes for new columns if they will be frequently queried/filtered on
CREATE INDEX idx_notifications_notification_type ON public.notifications(notification_type);
CREATE INDEX idx_notifications_related_entity ON public.notifications(related_entity_id, related_entity_type);

-- Update RLS policies if necessary.
-- For example, if link_url is constructed based on these new fields,
-- or if users should only see certain types of notifications.
-- Existing policies primarily focus on user_id, which should still be relevant.
-- The existing policy "Allow users to mark their own notifications as read" might need to be reviewed
-- if other fields besides is_read can be updated by users through this policy.
-- For now, we assume only is_read is updated by users directly.
