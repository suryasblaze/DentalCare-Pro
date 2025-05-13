-- Create ENUM type for urgent purchase request status
CREATE TYPE public.urgent_purchase_request_status AS ENUM (
    'pending_approval',
    'approved',
    'rejected',
    'draft' -- Added draft state for initial creation before submission
);

BEGIN;

-- 1. Add new columns without NOT NULL constraints or defaults initially, where data needs migration
ALTER TABLE public.urgent_purchases
    ADD COLUMN new_requested_by_user_id UUID,
    ADD COLUMN new_requested_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN reviewer_notes TEXT,
    ADD COLUMN new_status public.urgent_purchase_request_status;

-- 2. Populate new_requested_by_user_id from existing created_by
-- This assumes that for every auth.users.id in created_by, there's a corresponding profiles.id.
-- If created_by could be NULL or not map, new_requested_by_user_id will be NULL for those rows.
UPDATE public.urgent_purchases up
SET new_requested_by_user_id = p.id
FROM public.profiles p
WHERE p.id = up.created_by; -- Assuming profiles.id is the same as auth.users.id (auth.uid())

-- 3. Populate new_requested_at from existing created_at
UPDATE public.urgent_purchases
SET new_requested_at = created_at;

-- 4. Populate new_status based on existing status
UPDATE public.urgent_purchases
SET new_status = CASE status
    WHEN 'Pending Review' THEN 'pending_approval'::public.urgent_purchase_request_status
    WHEN 'Manually Confirmed' THEN 'approved'::public.urgent_purchase_request_status
    WHEN 'Auto-Confirmed' THEN 'approved'::public.urgent_purchase_request_status
    WHEN 'Rejected' THEN 'rejected'::public.urgent_purchase_request_status
    WHEN 'ProcessingError' THEN 'pending_approval'::public.urgent_purchase_request_status
    ELSE 'draft'::public.urgent_purchase_request_status
END;

-- 5. Drop old columns and constraints
-- Ensure the constraint name is correct for your DB or use a more generic drop if needed.
-- Example: Find constraint name: SELECT conname FROM pg_constraint WHERE conrelid = 'public.urgent_purchases'::regclass AND consrc LIKE '%status%';
ALTER TABLE public.urgent_purchases
    DROP CONSTRAINT IF EXISTS urgent_purchases_status_check, -- Replace with actual name if different
    DROP COLUMN IF EXISTS created_by, -- Use IF EXISTS for safety
    DROP COLUMN IF EXISTS created_at, -- Use IF EXISTS for safety
    DROP COLUMN IF EXISTS status;     -- Use IF EXISTS for safety

-- 6. Rename new columns to final names and apply constraints
ALTER TABLE public.urgent_purchases
    RENAME COLUMN new_requested_by_user_id TO requested_by_user_id;
ALTER TABLE public.urgent_purchases
    RENAME COLUMN new_requested_at TO requested_at;
ALTER TABLE public.urgent_purchases
    RENAME COLUMN new_status TO status;

ALTER TABLE public.urgent_purchases
    -- requested_by_user_id is now initially nullable.
    -- Add the NOT NULL constraint later after ensuring data integrity:
    -- Example: ALTER TABLE public.urgent_purchases ALTER COLUMN requested_by_user_id SET NOT NULL;
    ADD CONSTRAINT fk_requested_by_user_id FOREIGN KEY (requested_by_user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    ALTER COLUMN requested_at SET NOT NULL, -- Assuming new_requested_at was populated for all rows
    ALTER COLUMN requested_at SET DEFAULT timezone('utc'::text, now()),
    ALTER COLUMN status SET NOT NULL, -- Assuming new_status was populated for all rows
    ALTER COLUMN status SET DEFAULT 'draft'::public.urgent_purchase_request_status;

-- Add indexes for new/renamed columns
CREATE INDEX IF NOT EXISTS idx_urgent_purchases_requested_by ON public.urgent_purchases(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_urgent_purchases_reviewed_by ON public.urgent_purchases(reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_urgent_purchases_status_new ON public.urgent_purchases(status);

-- RLS Policies updates
-- Drop existing policies first if they are being replaced
DROP POLICY IF EXISTS "Allow authenticated users to manage their own urgent purchases" ON public.urgent_purchases;
DROP POLICY IF EXISTS "Allow admin users to manage all urgent purchases" ON public.urgent_purchases;

-- New RLS Policies
CREATE POLICY "Allow users to create urgent purchase requests"
ON public.urgent_purchases
FOR INSERT
TO authenticated
WITH CHECK (requested_by_user_id = auth.uid());

CREATE POLICY "Allow users to view their own urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (requested_by_user_id = auth.uid() OR requested_by_user_id IS NULL); -- Allow viewing if somehow requested_by is null initially

CREATE POLICY "Allow users to update their draft or pending urgent purchase requests"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (requested_by_user_id = auth.uid() AND status IN ('draft', 'pending_approval'))
WITH CHECK (requested_by_user_id = auth.uid());

CREATE POLICY "Allow approvers to view pending urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING (
    status = 'pending_approval' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'doctor')
);

CREATE POLICY "Allow approvers to approve or reject urgent purchase requests"
ON public.urgent_purchases
FOR UPDATE
TO authenticated
USING (
    status = 'pending_approval' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'doctor')
)
WITH CHECK (
    reviewed_by_user_id = auth.uid() AND
    status IN ('approved', 'rejected')
);

CREATE POLICY "Allow admin/owner/doctor to view all urgent purchase requests"
ON public.urgent_purchases
FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'doctor') );


-- Update comments for new/modified columns
COMMENT ON COLUMN public.urgent_purchases.status IS 'Workflow status of the urgent purchase approval request.';
COMMENT ON COLUMN public.urgent_purchases.requested_by_user_id IS 'User who submitted the urgent purchase request. (Initially nullable, should be NOT NULL after data cleanup)';
COMMENT ON COLUMN public.urgent_purchases.requested_at IS 'Timestamp when the request was submitted.';
COMMENT ON COLUMN public.urgent_purchases.reviewed_by_user_id IS 'User who approved or rejected the request.';
COMMENT ON COLUMN public.urgent_purchases.reviewed_at IS 'Timestamp when the request was reviewed.';
COMMENT ON COLUMN public.urgent_purchases.reviewer_notes IS 'Optional notes from the reviewer.';

COMMIT;
