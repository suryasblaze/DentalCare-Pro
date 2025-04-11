-- supabase/migrations/20250410115400_add_tooth_id_to_treatment_plans.sql

ALTER TABLE public.treatment_plans
ADD COLUMN tooth_id smallint NULL;

ALTER TABLE public.treatment_plans
ADD CONSTRAINT fk_treatment_plans_tooth_id
FOREIGN KEY (tooth_id) REFERENCES public.teeth(id)
ON DELETE SET NULL; -- Or ON DELETE RESTRICT depending on desired behavior

COMMENT ON COLUMN public.treatment_plans.tooth_id IS 'Optional reference to a specific tooth involved in the treatment plan.';
