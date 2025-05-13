-- Create tags table
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT, -- e.g., hex code for tag color in UI (Removed NULLABLE)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL -- Optional: track who created the tag
);

COMMENT ON TABLE public.tags IS 'Stores tags that can be applied to assets for classification.';
COMMENT ON COLUMN public.tags.name IS 'Unique name of the tag (e.g., High Priority, Sterile Room, Leased).';
COMMENT ON COLUMN public.tags.color IS 'Optional color associated with the tag for UI display.';

CREATE INDEX idx_tags_name ON public.tags(name);

-- Create asset_tags junction table
CREATE TABLE public.asset_tags (
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Optional: track who assigned the tag
    PRIMARY KEY (asset_id, tag_id)
);

COMMENT ON TABLE public.asset_tags IS 'Junction table linking assets to tags.';
COMMENT ON COLUMN public.asset_tags.asset_id IS 'Foreign key to the asset.';
COMMENT ON COLUMN public.asset_tags.tag_id IS 'Foreign key to the tag.';
COMMENT ON COLUMN public.asset_tags.assigned_at IS 'Timestamp when the tag was assigned to the asset.';
COMMENT ON COLUMN public.asset_tags.assigned_by_user_id IS 'User who assigned the tag to the asset.';

-- Indexes for asset_tags
CREATE INDEX idx_asset_tags_asset_id ON public.asset_tags(asset_id);
CREATE INDEX idx_asset_tags_tag_id ON public.asset_tags(tag_id);

-- RLS for tags (adjust as needed)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow specific roles to manage tags" ON public.tags FOR ALL TO authenticated -- Consider restricting to 'manager' or similar
    USING (true) WITH CHECK (true); -- Add more specific checks if needed

-- RLS for asset_tags (adjust as needed)
ALTER TABLE public.asset_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view asset_tags" ON public.asset_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow specific roles to manage asset_tags" ON public.asset_tags FOR ALL TO authenticated -- Consider restricting
    USING (true) WITH CHECK (true);
