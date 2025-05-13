DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the existing check constraint on public.profiles.role
    -- This attempts to find it based on the table and part of its definition,
    -- as the exact auto-generated name might vary.
    SELECT conname
    INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND pg_get_constraintdef(oid) LIKE '%role IN (%''admin''%, %''doctor''%)%' -- Matches existing constraint
      AND contype = 'c'; -- 'c' for check constraint

    -- If found, drop it
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
    ELSE
        RAISE NOTICE 'Could not find the specific role check constraint on public.profiles to drop. Manual check might be needed if the new constraint fails.';
    END IF;
END $$;

-- Add the new check constraint that includes 'owner'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'doctor', 'owner'));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS 'Ensures user role is one of the defined values: admin, doctor, or owner.';

-- Optional: Update existing profiles if any were intended to be 'owner'
-- but couldn't be due to the old constraint. This would be a manual data fix.
-- Example: UPDATE public.profiles SET role = 'owner' WHERE id = 'some_user_id_that_should_be_owner';
