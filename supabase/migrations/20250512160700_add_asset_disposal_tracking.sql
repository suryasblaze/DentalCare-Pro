-- Add disposal tracking fields to the assets table
ALTER TABLE public.assets
ADD COLUMN disposal_date DATE,
ADD COLUMN disposal_reason TEXT, -- Consider using an ENUM or CHECK constraint for specific reasons
ADD COLUMN disposal_notes TEXT,
ADD COLUMN salvage_value NUMERIC(10, 2);

COMMENT ON COLUMN public.assets.disposal_date IS 'Date the asset was officially disposed of.';
COMMENT ON COLUMN public.assets.disposal_reason IS 'Reason for disposal (e.g., Sold, Scrapped, Donated, Stolen, Obsolete).';
COMMENT ON COLUMN public.assets.disposal_notes IS 'Additional notes regarding the disposal.';
COMMENT ON COLUMN public.assets.salvage_value IS 'Value recovered from disposing the asset.';

-- Create asset_disposal_log table
CREATE TABLE public.asset_disposal_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    disposed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    disposal_recorded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    disposal_date DATE NOT NULL,
    disposal_reason TEXT NOT NULL,
    disposal_notes TEXT, -- Removed NULLABLE
    salvage_value NUMERIC(10, 2), -- Removed NULLABLE
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.asset_disposal_log IS 'Audit log for asset disposal events.';
COMMENT ON COLUMN public.asset_disposal_log.asset_id IS 'The asset that was disposed of.';
COMMENT ON COLUMN public.asset_disposal_log.disposed_by_user_id IS 'The user who recorded the disposal action.';
COMMENT ON COLUMN public.asset_disposal_log.disposal_recorded_at IS 'Timestamp when the disposal was recorded in the system.';
COMMENT ON COLUMN public.asset_disposal_log.disposal_date IS 'Actual date of asset disposal.';
COMMENT ON COLUMN public.asset_disposal_log.disposal_reason IS 'The reason provided for disposing the asset.';
COMMENT ON COLUMN public.asset_disposal_log.disposal_notes IS 'Any additional notes related to the disposal.';
COMMENT ON COLUMN public.asset_disposal_log.salvage_value IS 'The salvage value obtained from the disposal.';

-- Indexes for asset_disposal_log
CREATE INDEX idx_asset_disposal_log_asset_id ON public.asset_disposal_log(asset_id);
CREATE INDEX idx_asset_disposal_log_disposed_by_user_id ON public.asset_disposal_log(disposed_by_user_id);
CREATE INDEX idx_asset_disposal_log_disposal_date ON public.asset_disposal_log(disposal_date);

-- RLS for asset_disposal_log (adjust as needed)
ALTER TABLE public.asset_disposal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view disposal logs"
ON public.asset_disposal_log
FOR SELECT
TO authenticated
USING (true); -- Or more restrictive policies

CREATE POLICY "Allow specific roles to insert disposal logs"
ON public.asset_disposal_log
FOR INSERT
TO authenticated -- Consider restricting to specific roles like 'manager'
WITH CHECK (true);
