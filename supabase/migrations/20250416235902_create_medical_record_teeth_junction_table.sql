-- Junction table for Medical Records and Teeth
CREATE TABLE public.medical_record_teeth (
    medical_record_id uuid NOT NULL,
    tooth_id smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT medical_record_teeth_pkey PRIMARY KEY (medical_record_id, tooth_id),
    CONSTRAINT fk_medical_record_teeth_record FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id) ON DELETE CASCADE, -- Cascade delete if record is deleted
    CONSTRAINT fk_medical_record_teeth_tooth FOREIGN KEY (tooth_id) REFERENCES public.teeth(id) ON DELETE CASCADE -- Cascade delete if tooth is deleted
);

COMMENT ON TABLE public.medical_record_teeth IS 'Junction table linking medical records to specific teeth involved.';
COMMENT ON COLUMN public.medical_record_teeth.medical_record_id IS 'Reference to the medical record.';
COMMENT ON COLUMN public.medical_record_teeth.tooth_id IS 'Reference to the specific tooth (FDI notation ID).';

-- Optional: Add indexes for performance on foreign keys
CREATE INDEX idx_medical_record_teeth_record_id ON public.medical_record_teeth(medical_record_id);
CREATE INDEX idx_medical_record_teeth_tooth_id ON public.medical_record_teeth(tooth_id);
