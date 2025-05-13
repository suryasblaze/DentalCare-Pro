-- Ensure RLS is enabled on the table
ALTER TABLE public.urgent_purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.urgent_purchases FORCE ROW LEVEL SECURITY; -- Optional: ensures default deny

-- **IMPORTANT**: Ensure ALL other policies on urgent_purchases are DELETED before running this.

-- 1. Policy to allow creating a draft
CREATE POLICY "DIAGNOSTIC_Allow_INSERT_Draft"
ON public.urgent_purchases
FOR INSERT
TO authenticated
WITH CHECK (
    requested_by_user_id = auth.uid() AND
    status = 'draft' AND
    target_approval_role IS NOT NULL -- Crucial: target must be set when creating draft
);

-- 2. Policy to allow the requester to submit their own draft to pending_approval
CREATE POLICY "DIAGNOSTIC_Allow_Submit_Own_Draft_to_Pending"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (
    requested_by_user_id = auth.uid() AND
    status = 'draft'
)
WITH CHECK (
    requested_by_user_id = auth.uid() AND -- Owner must remain the same
    status = 'pending_approval' AND         -- New status must be pending_approval
    target_approval_role IS NOT NULL     -- Target role must still be set
);

-- 3. Minimal SELECT policy to see own drafts (to verify creation)
CREATE POLICY "DIAGNOSTIC_Allow_SELECT_Own_Drafts"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    requested_by_user_id = auth.uid() AND
    status = 'draft'
);

-- 4. Minimal SELECT policy to see own pending_approval items (to verify submission)
-- AND to allow the .select().single() in the service function after update.
CREATE POLICY "DIAGNOSTIC_Allow_SELECT_Own_Pending_Approval"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    requested_by_user_id = auth.uid() AND
    status = 'pending_approval'
);
