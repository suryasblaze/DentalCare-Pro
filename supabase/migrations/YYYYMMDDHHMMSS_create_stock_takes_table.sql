CREATE TABLE public.stock_takes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    system_quantity_at_count integer NOT NULL,
    physical_counted_quantity integer NOT NULL,
    variance integer GENERATED ALWAYS AS (physical_counted_quantity - system_quantity_at_count) STORED,
    counted_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    counted_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    is_variance_resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.stock_takes IS 'Records of physical stock counts and their variance against system quantities.';
COMMENT ON COLUMN public.stock_takes.inventory_item_id IS 'The inventory item that was counted.';
COMMENT ON COLUMN public.stock_takes.system_quantity_at_count IS 'The quantity recorded in the system at the time of the count.';
COMMENT ON COLUMN public.stock_takes.physical_counted_quantity IS 'The actual quantity physically counted.';
COMMENT ON COLUMN public.stock_takes.variance IS 'Calculated difference: physical_counted_quantity - system_quantity_at_count.';
COMMENT ON COLUMN public.stock_takes.counted_by_user_id IS 'The user who performed the stock take.';
COMMENT ON COLUMN public.stock_takes.counted_at IS 'Timestamp of when the stock take was performed.';
COMMENT ON COLUMN public.stock_takes.notes IS 'Optional notes regarding the stock take (e.g., reasons for variance).';
COMMENT ON COLUMN public.stock_takes.is_variance_resolved IS 'Flag to indicate if a variance has been addressed (e.g., by an adjustment).';

-- Enable RLS
ALTER TABLE public.stock_takes ENABLE ROW LEVEL SECURITY;

-- Policies for stock_takes
CREATE POLICY "Allow authenticated users to insert their own stock takes"
ON public.stock_takes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = counted_by_user_id);

CREATE POLICY "Allow admin users to read all stock takes"
ON public.stock_takes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Allow admin users to update stock takes"
ON public.stock_takes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Trigger to update 'updated_at' timestamp
CREATE TRIGGER handle_updated_at_stock_takes
BEFORE UPDATE ON public.stock_takes
FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime (updated_at);
