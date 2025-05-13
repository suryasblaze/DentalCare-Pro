-- Drop existing policies that need to be changed
ALTER TABLE public.inventory_adjustment_requests DISABLE ROW LEVEL SECURITY; -- Temporarily disable to drop policies

DROP POLICY IF EXISTS "Allow admin/manager to view all adjustment requests" ON public.inventory_adjustment_requests;
DROP POLICY IF EXISTS "Allow admin/manager to update adjustment requests" ON public.inventory_adjustment_requests;
DROP POLICY IF EXISTS "Allow users to view their own adjustment requests" ON public.inventory_adjustment_requests; -- Add this line

-- Re-enable RLS before creating new policies
ALTER TABLE public.inventory_adjustment_requests ENABLE ROW LEVEL SECURITY;

-- New policy to allow admin, inventory_manager, doctor, owner to view all requests
CREATE POLICY "Allow authorized roles to view all adjustment requests"
ON public.inventory_adjustment_requests
FOR SELECT
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager', 'doctor', 'owner')
    OR
    requested_by_user_id = auth.uid() -- Also allow users to see their own requests (combines previous individual policy)
);

-- New policy to allow admin, inventory_manager, doctor, owner to update (approve/reject) requests
CREATE POLICY "Allow authorized roles to update adjustment requests"
ON public.inventory_adjustment_requests
FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager', 'doctor', 'owner')
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager', 'doctor', 'owner')
    AND reviewed_by_user_id = auth.uid() -- Ensure the reviewer is the one updating
    AND status = 'pending' -- Can only update pending requests through this policy
);

-- Note: The policies "Allow users to create their own adjustment requests" and
-- "Allow users to view their own adjustment requests" (if it was separate)
-- and "Allow admin/manager to delete adjustment requests" might also need review
-- based on who should perform those actions.
-- The new SELECT policy above now includes users viewing their own requests.
-- If the old "Allow users to view their own adjustment requests" policy still exists, it might be redundant or you can drop it.
-- For simplicity, I'm focusing on the view all and update policies.

-- It's good practice to ensure the default RLS is DENY.
-- If not already set, you might consider:
-- ALTER TABLE public.inventory_adjustment_requests FORCE ROW LEVEL SECURITY;
-- This ensures no access if no policy matches.
