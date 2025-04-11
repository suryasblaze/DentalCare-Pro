-- Junction table for Treatment Plans and Teeth
CREATE TABLE public.treatment_plan_teeth (
    treatment_plan_id uuid NOT NULL,
    tooth_id smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT treatment_plan_teeth_pkey PRIMARY KEY (treatment_plan_id, tooth_id),
    CONSTRAINT fk_treatment_plan_teeth_plan FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE, -- Cascade delete if plan is deleted
    CONSTRAINT fk_treatment_plan_teeth_tooth FOREIGN KEY (tooth_id) REFERENCES public.teeth(id) ON DELETE CASCADE -- Cascade delete if tooth is deleted (consider RESTRICT if teeth shouldn't be deleted if referenced)
);

COMMENT ON TABLE public.treatment_plan_teeth IS 'Junction table linking treatment plans to specific teeth involved.';
COMMENT ON COLUMN public.treatment_plan_teeth.treatment_plan_id IS 'Reference to the treatment plan.';
COMMENT ON COLUMN public.treatment_plan_teeth.tooth_id IS 'Reference to the specific tooth (FDI notation ID).';

-- Optional: Add indexes for performance on foreign keys
CREATE INDEX idx_treatment_plan_teeth_plan_id ON public.treatment_plan_teeth(treatment_plan_id);
CREATE INDEX idx_treatment_plan_teeth_tooth_id ON public.treatment_plan_teeth(tooth_id);
