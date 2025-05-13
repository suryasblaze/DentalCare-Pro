-- Temporarily disable RLS to modify policies
ALTER TABLE public.inventory_adjustment_requests DISABLE ROW LEVEL SECURITY;

-- Drop the existing update policy
DROP POLICY IF EXISTS "Allow authorized roles to update adjustment requests" ON public.inventory_adjustment_requests;

-- Re-create the update policy with self-approval prevention
CREATE POLICY "Allow authorized roles to update adjustment requests (no self-approval)"
ON public.inventory_adjustment_requests
FOR UPDATE
TO authenticated
USING (
    -- User must have one of the authorized roles to even attempt an update
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager', 'doctor', 'owner')
)
WITH CHECK (
    -- All these conditions must be true for the update to proceed
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager', 'doctor', 'owner') -- User has an approval role
    AND reviewed_by_user_id = auth.uid() -- The user performing the update is marked as the reviewer
    AND status = 'pending'               -- Only pending requests can be updated by this policy
    AND requested_by_user_id <> auth.uid() -- The requester cannot be the approver/rejecter
);

-- Re-enable RLS
ALTER TABLE public.inventory_adjustment_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Allow authorized roles to update adjustment requests (no self-approval)" ON public.inventory_adjustment_requests IS 'Allows users with specific roles (admin, inventory_manager, doctor, owner) to approve or reject pending adjustment requests, but prevents them from approving/rejecting their own requests.';
