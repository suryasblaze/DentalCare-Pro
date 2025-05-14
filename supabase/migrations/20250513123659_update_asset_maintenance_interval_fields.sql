-- File: supabase/migrations/20250513123659_update_asset_maintenance_interval_fields.sql

-- Rename maintenance_interval_months to maintenance_interval_value
ALTER TABLE public.assets
RENAME COLUMN maintenance_interval_months TO maintenance_interval_value;

-- Add maintenance_interval_unit column
ALTER TABLE public.assets
ADD COLUMN maintenance_interval_unit TEXT;

-- Add check constraint for allowed units
ALTER TABLE public.assets
ADD CONSTRAINT check_maintenance_interval_unit
CHECK (maintenance_interval_unit IN ('days', 'weeks', 'months', 'years'));

-- Update comments
COMMENT ON COLUMN public.assets.maintenance_interval_value IS 'Numerical value for the maintenance interval (e.g., 7, 2, 3, 1).';
COMMENT ON COLUMN public.assets.maintenance_interval_unit IS 'Unit for the maintenance interval (days, weeks, months, years).';

-- Note: If you had data in maintenance_interval_months and it was, for example, 3 (representing 3 months),
-- you might want to manually update maintenance_interval_unit to 'months' for those rows after running this migration,
-- or handle this in a data migration step if necessary. For new assets, the UI will set both fields.

-- Also, any functions or triggers that relied on maintenance_interval_months
-- (especially for calculating next_maintenance_due_date) will need to be reviewed and updated
-- to use both maintenance_interval_value and maintenance_interval_unit.
-- For example, the RPC function 'mark_as_serviced_rpc' likely needs an update.
