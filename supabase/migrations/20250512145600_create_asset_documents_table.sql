-- Create asset_documents table for multiple file attachments per asset
CREATE TABLE public.asset_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- URL to the file in Supabase Storage or other S3-compatible storage
    file_type TEXT, -- MIME type of the file, e.g., 'application/pdf', 'image/jpeg'
    file_size_bytes BIGINT, -- Size of the file in bytes
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    uploaded_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    description TEXT -- Optional description for the document
);

COMMENT ON TABLE public.asset_documents IS 'Stores multiple documents related to an asset (e.g., manuals, service reports).';
COMMENT ON COLUMN public.asset_documents.asset_id IS 'The asset to which this document is attached.';
COMMENT ON COLUMN public.asset_documents.file_name IS 'Original name of the uploaded file.';
COMMENT ON COLUMN public.asset_documents.file_url IS 'Storage URL of the document.';
COMMENT ON COLUMN public.asset_documents.file_type IS 'MIME type of the document.';
COMMENT ON COLUMN public.asset_documents.file_size_bytes IS 'Size of the document in bytes.';
COMMENT ON COLUMN public.asset_documents.uploaded_at IS 'Timestamp when the document was uploaded.';
COMMENT ON COLUMN public.asset_documents.uploaded_by_user_id IS 'The user who uploaded the document.';
COMMENT ON COLUMN public.asset_documents.description IS 'Optional description or notes for the document.';

-- Indexes for asset_documents
CREATE INDEX idx_asset_documents_asset_id ON public.asset_documents(asset_id);
CREATE INDEX idx_asset_documents_uploaded_by_user_id ON public.asset_documents(uploaded_by_user_id);

-- RLS for asset_documents
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view documents for assets they can access
-- (This might need to join with assets and check asset-level permissions if they are more complex)
CREATE POLICY "Allow authenticated users to view asset documents"
ON public.asset_documents
FOR SELECT
TO authenticated
USING (true); -- Or, more securely: USING (EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_documents.asset_id AND auth.uid() = assets.responsible_user_id)) or based on roles

-- Allow specific roles or responsible users to upload documents
CREATE POLICY "Allow specific roles to upload asset documents"
ON public.asset_documents
FOR INSERT
TO authenticated -- Consider restricting to specific roles
WITH CHECK (true); -- Add checks, e.g., user is responsible for the asset or has 'manager' role

-- Allow uploader or specific roles to delete documents
CREATE POLICY "Allow uploader or specific roles to delete asset documents"
ON public.asset_documents
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by_user_id); -- Or role-based check

-- Note: The existing `assets.service_document_url` might be considered legacy.
-- A data migration step could be added here to move data from `assets.service_document_url`
-- to this new `asset_documents` table if needed, for example:
-- INSERT INTO public.asset_documents (asset_id, file_name, file_url, uploaded_at, description)
-- SELECT id, 'migrated_document.pdf', service_document_url, created_at, 'Migrated from old service_document_url field'
-- FROM public.assets
-- WHERE service_document_url IS NOT NULL AND service_document_url != '';
-- After migration, `assets.service_document_url` could be dropped or kept for read-only purposes.
-- For now, we are not performing this data migration automatically.
