-- Ensure RLS is enabled on the table
ALTER TABLE public.urgent_purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.urgent_purchases FORCE ROW LEVEL SECURITY; -- Optional

-- **IMPORTANT**: Ensure ALL other policies on urgent_purchases are DELETED before running this.
-- (You mentioned you did this manually, so these drops are for script idempotency if run again)
DROP POLICY IF EXISTS "DIAGNOSTIC_Allow_INSERT_Draft" ON public.urgent_purchases;
DROP POLICY IF EXISTS "DIAGNOSTIC_Allow_Submit_Own_Draft_to_Pending" ON public.urgent_purchases;
DROP POLICY IF EXISTS "DIAGNOSTIC_Allow_SELECT_Own_Drafts" ON public.urgent_purchases;
DROP POLICY IF EXISTS "DIAGNOSTIC_Allow_SELECT_Own_Pending_Approval" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow designated roles to view OTHERS pending urgent purchase requests" ON public.urgent_purchases; -- Name changed in step3
DROP POLICY IF EXISTS "Allow designated roles to view their pending urgent purchase requests" ON public.urgent_purchases; -- Old name, ensure dropped
DROP POLICY IF EXISTS "Allow designated roles to approve or reject their urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow requesters to view their non-pending urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow admin_owner_doctor to view non-pending urgent purchases" ON public.urgent_purchases;


-- 1. Policy to allow creating a draft
CREATE POLICY "DIAGNOSTIC_Allow_INSERT_Draft"
ON public.urgent_purchases
FOR INSERT
TO authenticated
WITH CHECK (
    requested_by_user_id = auth.uid() AND
    status = 'draft' AND
    target_approval_role IS NOT NULL
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
    requested_by_user_id = auth.uid() AND
    status = 'pending_approval' AND
    target_approval_role IS NOT NULL
);

-- 3. SELECT policy for requester to see own drafts
CREATE POLICY "DIAGNOSTIC_Allow_SELECT_Own_Drafts"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    requested_by_user_id = auth.uid() AND
    status = 'draft'
);

-- 4. SELECT policy for requester to see own pending_approval items
CREATE POLICY "DIAGNOSTIC_Allow_SELECT_Own_Pending_Approval"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    requested_by_user_id = auth.uid() AND
    status = 'pending_approval'
);

-- 5. SELECT Policy for the APPROVAL QUEUE:
CREATE POLICY "Allow designated roles to view OTHERS pending urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    status = 'pending_approval' AND
    target_approval_role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    requested_by_user_id <> auth.uid()
);

-- 6. UPDATE Policy for designated roles to approve/reject requests
CREATE POLICY "Allow designated roles to approve or reject their urgent purchase requests"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (
    status = 'pending_approval' AND
    target_approval_role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    requested_by_user_id <> auth.uid()
)
WITH CHECK (
    reviewed_by_user_id = auth.uid() AND
    status IN ('approved', 'rejected') AND
    requested_by_user_id <> auth.uid()
);

-- 7. **NEW**: Policy for viewing non-pending (approved, rejected) requests by the requester
CREATE POLICY "Allow requesters to view their non-pending urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (requested_by_user_id = auth.uid() AND status IN ('approved', 'rejected'));

-- 8. **NEW**: Policy for Admin/Owner/Doctor to see all non-pending requests (for historical/reporting).
CREATE POLICY "Allow admin_owner_doctor to view non-pending urgent purchases"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    status IN ('approved', 'rejected') AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'doctor')
);
