-- supabase/migrations/YYYYMMDDHHMMSS_add_rls_insert_policy_notifications.sql
-- Replace YYYYMMDDHHMMSS with the actual timestamp, e.g., 20250506115100

-- Allow authenticated users to insert their own notifications
CREATE POLICY "Allow users to insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated -- Apply to any logged-in user
WITH CHECK (auth.uid() = user_id); -- Ensure the user_id being inserted matches the logged-in user

-- Optional: Add a comment for clarity
COMMENT ON POLICY "Allow users to insert their own notifications" ON public.notifications IS 'Authenticated users can insert notifications linked to their own user ID.';
