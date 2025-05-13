-- Add maintenance_interval_months and responsible_user_id to assets table
ALTER TABLE public.assets
ADD COLUMN maintenance_interval_months INTEGER,
ADD COLUMN responsible_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.assets.maintenance_interval_months IS 'Frequency of maintenance in months (e.g., 3, 6, 12). Used to calculate next due date.';
COMMENT ON COLUMN public.assets.responsible_user_id IS 'The user responsible for this asset''s maintenance (e.g., asset manager, branch lead).';

-- Create maintenance_log table
CREATE TABLE public.maintenance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    serviced_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who marked it as serviced
    serviced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    previous_last_serviced_date DATE,
    previous_next_maintenance_due_date DATE,
    new_last_serviced_date DATE NOT NULL,
    new_next_maintenance_due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.maintenance_log IS 'Audit log for asset maintenance events.';
COMMENT ON COLUMN public.maintenance_log.asset_id IS 'The asset that was serviced.';
COMMENT ON COLUMN public.maintenance_log.serviced_by_user_id IS 'The user who recorded the maintenance action.';
COMMENT ON COLUMN public.maintenance_log.serviced_at IS 'Timestamp when the maintenance was recorded.';
COMMENT ON COLUMN public.maintenance_log.notes IS 'Optional notes about the maintenance performed.';
COMMENT ON COLUMN public.maintenance_log.previous_last_serviced_date IS 'The last_serviced_date before this maintenance entry.';
COMMENT ON COLUMN public.maintenance_log.previous_next_maintenance_due_date IS 'The next_maintenance_due_date before this maintenance entry.';
COMMENT ON COLUMN public.maintenance_log.new_last_serviced_date IS 'The updated last_serviced_date (typically the date of this service).';
COMMENT ON COLUMN public.maintenance_log.new_next_maintenance_due_date IS 'The newly calculated next_maintenance_due_date.';

-- Indexes for maintenance_log
CREATE INDEX idx_maintenance_log_asset_id ON public.maintenance_log(asset_id);
CREATE INDEX idx_maintenance_log_serviced_by_user_id ON public.maintenance_log(serviced_by_user_id);
CREATE INDEX idx_maintenance_log_serviced_at ON public.maintenance_log(serviced_at);

-- RLS for maintenance_log (adjust as needed, e.g., allow specific roles to insert/view)
ALTER TABLE public.maintenance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view maintenance logs"
ON public.maintenance_log
FOR SELECT
TO authenticated
USING (true); -- Or more restrictive, e.g., based on user's role or asset access

CREATE POLICY "Allow specific roles to insert maintenance logs"
ON public.maintenance_log
FOR INSERT
TO authenticated -- Consider restricting to specific roles like 'manager' or 'technician'
WITH CHECK (true); -- Add checks if necessary, e.g., user is responsible_user_id for the asset

-- It might be good to update the existing assets.next_maintenance_due_date index if it's heavily used for reminders
-- DROP INDEX IF EXISTS idx_asset_next_maintenance;
-- CREATE INDEX idx_asset_next_maintenance_due_date ON assets(next_maintenance_due_date); -- Renaming for consistency if desired
-- The existing index is fine: CREATE INDEX idx_asset_next_maintenance ON assets(next_maintenance_due_date);
