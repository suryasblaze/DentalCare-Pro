-- Add target_approval_role to urgent_purchases table

ALTER TABLE public.urgent_purchases
ADD COLUMN IF NOT EXISTS target_approval_role TEXT;

COMMENT ON COLUMN public.urgent_purchases.target_approval_role IS 'The role designated to approve this urgent purchase request (e.g., ''admin'', ''owner'', ''doctor'').';

-- Add a check constraint for allowed roles. Adjust roles as necessary.
-- Ensure this list matches the roles defined in your public.profiles table or your application logic.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_urgent_purchase_target_role' AND conrelid = 'public.urgent_purchases'::regclass
    ) THEN
        ALTER TABLE public.urgent_purchases
        ADD CONSTRAINT chk_urgent_purchase_target_role
        CHECK (target_approval_role IN ('admin', 'owner', 'doctor'));
    END IF;
END$$;

-- Ensure RLS is enabled before dropping/creating policies
ALTER TABLE public.urgent_purchases ENABLE ROW LEVEL SECURITY;

-- Drop ALL known OLD policies and potentially problematic default policies first.
-- Order of drops doesn't strictly matter due to IF EXISTS, but grouping helps.
DROP POLICY IF EXISTS "Allow authenticated users to manage their own urgent purchases" ON public.urgent_purchases; -- From user screenshot, broad
DROP POLICY IF EXISTS "Allow admin_or_owner to manage all urgent purchases" ON public.urgent_purchases; -- Broad
DROP POLICY IF EXISTS "Allow admin users to manage all urgent purchases" ON public.urgent_purchases; -- From initial script, broad
DROP POLICY IF EXISTS "Allow users to view their own urgent purchase requests" ON public.urgent_purchases; -- Generic
DROP POLICY IF EXISTS "Allow admin/owner/doctor to view all urgent purchase requests" ON public.urgent_purchases; -- Generic
DROP POLICY IF EXISTS "Allow users to update their draft or pending urgent purchase requests" ON public.urgent_purchases; -- Generic
DROP POLICY IF EXISTS "Allow approvers to view pending urgent purchase requests" ON public.urgent_purchases; -- Old name
DROP POLICY IF EXISTS "Allow approvers to approve or reject urgent purchase requests" ON public.urgent_purchases; -- Old name
DROP POLICY IF EXISTS "Allow admin to view all pending urgent purchase requests for oversight" ON public.urgent_purchases; -- Specific admin oversight

-- Drop policies that THIS SCRIPT (re)creates, to make it idempotent
DROP POLICY IF EXISTS "Allow users to create urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow users to view their own DRAFT urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow users to update their own DRAFT urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow requesters to submit their DRAFT for approval" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow users to delete their own DRAFT urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow designated roles to view their pending urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow designated roles to approve or reject their urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow requesters to view their non-pending urgent purchase requests" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow admin_owner_doctor to view non-pending urgent purchases" ON public.urgent_purchases;


-- Recreate essential policies with new logic:

-- Policy for users to create requests (assigns their ID as requester)
CREATE POLICY "Allow users to create urgent purchase requests"
ON public.urgent_purchases
FOR INSERT
TO authenticated
WITH CHECK (
    requested_by_user_id = auth.uid() AND
    status = 'draft' AND -- Ensure new requests are drafts
    target_approval_role IS NOT NULL -- Ensure target role is set on creation
);

-- Policy for users to view their OWN draft requests
CREATE POLICY "Allow users to view their own DRAFT urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (requested_by_user_id = auth.uid() AND status = 'draft');

-- Policy for users to update their OWN draft requests (e.g., changing notes, items)
CREATE POLICY "Allow users to update their own DRAFT urgent purchase requests"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (requested_by_user_id = auth.uid() AND status = 'draft')
-- This WITH CHECK allows status to remain 'draft' OR become 'pending_approval' (if target_approval_role is also set).
-- The specific submission policy's WITH CHECK will be more stringent for the pending_approval transition.
WITH CHECK (
    requested_by_user_id = auth.uid() AND
    target_approval_role IS NOT NULL AND -- Target role must be set to update a draft
    (status = 'draft' OR status = 'pending_approval')
);

-- Policy for users to submit their OWN draft requests for approval (changes status to pending_approval)
CREATE POLICY "Allow requesters to submit their DRAFT for approval"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (requested_by_user_id = auth.uid() AND status = 'draft') -- Row must be a draft owned by user
WITH CHECK (
    requested_by_user_id = auth.uid() AND
    status = 'pending_approval' AND
    target_approval_role IS NOT NULL -- A request pending approval MUST have a target role.
);

-- Optional: Policy for users to delete their OWN draft requests
CREATE POLICY "Allow users to delete their own DRAFT urgent purchase requests"
ON public.urgent_purchases
FOR DELETE
TO authenticated
USING (requested_by_user_id = auth.uid() AND status = 'draft');


-- Policy for designated roles to view pending requests assigned to their role (for the approval queue)
CREATE POLICY "Allow designated roles to view their pending urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    status = 'pending_approval' AND
    target_approval_role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Policy for designated roles to update (approve/reject) requests assigned to their role
CREATE POLICY "Allow designated roles to approve or reject their urgent purchase requests"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (
    status = 'pending_approval' AND
    target_approval_role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    requested_by_user_id <> auth.uid() -- Prevent self-approval via this policy
)
WITH CHECK (
    reviewed_by_user_id = auth.uid() AND
    status IN ('approved', 'rejected') AND
    requested_by_user_id <> auth.uid() -- Double-check: reviewer cannot be requester
);

-- Policy for viewing non-pending (approved, rejected) requests:
-- Option A: Requester can see their non-pending requests.
CREATE POLICY "Allow requesters to view their non-pending urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (requested_by_user_id = auth.uid() AND status IN ('approved', 'rejected'));

-- Option B: Admin/Owner/Doctor can see all non-pending requests (for historical/reporting).
CREATE POLICY "Allow admin_owner_doctor to view non-pending urgent purchases"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    status IN ('approved', 'rejected') AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'doctor')
);

COMMENT ON POLICY "Allow users to create urgent purchase requests" ON public.urgent_purchases IS 'Ensures new requests are drafts, owned by creator, and have a target role.';
COMMENT ON POLICY "Allow users to update their own DRAFT urgent purchase requests" ON public.urgent_purchases IS 'Allows users to edit their own draft requests. Target role must be set. Status can remain draft or become pending_approval.';
COMMENT ON POLICY "Allow requesters to submit their DRAFT for approval" ON public.urgent_purchases IS 'Specifically allows a requester to change the status of their draft to pending_approval, ensuring target role is set.';
COMMENT ON POLICY "Allow designated roles to approve or reject their urgent purchase requests" ON public.urgent_purchases IS 'Allows targeted roles to approve/reject requests not their own.';

-- Consider forcing RLS if not already default for new tables in your Supabase project
-- ALTER TABLE public.urgent_purchases FORCE ROW LEVEL SECURITY;
