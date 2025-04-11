-- Junction table for AI Treatment Plans and Teeth
CREATE TABLE public.ai_treatment_plans_teeth (
    ai_treatment_plan_id uuid NOT NULL,
    tooth_id smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT ai_treatment_plans_teeth_pkey PRIMARY KEY (ai_treatment_plan_id, tooth_id),
    CONSTRAINT fk_ai_treatment_plans_teeth_plan FOREIGN KEY (ai_treatment_plan_id) REFERENCES public.ai_treatment_plans(id) ON DELETE CASCADE, -- Cascade delete if plan is deleted
    CONSTRAINT fk_ai_treatment_plans_teeth_tooth FOREIGN KEY (tooth_id) REFERENCES public.teeth(id) ON DELETE CASCADE -- Cascade delete if tooth is deleted (consider RESTRICT if teeth shouldn't be deleted if referenced)
);

COMMENT ON TABLE public.ai_treatment_plans_teeth IS 'Junction table linking AI treatment plans to specific teeth involved.';
COMMENT ON COLUMN public.ai_treatment_plans_teeth.ai_treatment_plan_id IS 'Reference to the AI treatment plan.';
COMMENT ON COLUMN public.ai_treatment_plans_teeth.tooth_id IS 'Reference to the specific tooth (FDI notation ID).';

-- Optional: Add indexes for performance on foreign keys
CREATE INDEX idx_ai_treatment_plans_teeth_plan_id ON public.ai_treatment_plans_teeth(ai_treatment_plan_id);
CREATE INDEX idx_ai_treatment_plans_teeth_tooth_id ON public.ai_treatment_plans_teeth(tooth_id);
