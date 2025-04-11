-- supabase/migrations/20250410114700_create_teeth_table.sql

CREATE TABLE public.teeth (
    id smallint PRIMARY KEY,
    description text NOT NULL,
    quadrant smallint NOT NULL,
    notation_type text DEFAULT 'FDI' NOT NULL
);

COMMENT ON TABLE public.teeth IS 'Stores information about individual teeth using FDI notation.';
COMMENT ON COLUMN public.teeth.id IS 'FDI notation number (e.g., 11, 21, 31, 41).';
COMMENT ON COLUMN public.teeth.description IS 'Description of the tooth (e.g., Upper Right Central Incisor).';
COMMENT ON COLUMN public.teeth.quadrant IS 'Quadrant number (1-4).';
COMMENT ON COLUMN public.teeth.notation_type IS 'Type of notation used (e.g., FDI).';

-- Insert permanent teeth data
INSERT INTO public.teeth (id, description, quadrant) VALUES
-- Quadrant 1
(11, 'Upper Right Central Incisor', 1),
(12, 'Upper Right Lateral Incisor', 1),
(13, 'Upper Right Canine', 1),
(14, 'Upper Right First Premolar', 1),
(15, 'Upper Right Second Premolar', 1),
(16, 'Upper Right First Molar', 1),
(17, 'Upper Right Second Molar', 1),
(18, 'Upper Right Third Molar (Wisdom Tooth)', 1),
-- Quadrant 2
(21, 'Upper Left Central Incisor', 2),
(22, 'Upper Left Lateral Incisor', 2),
(23, 'Upper Left Canine', 2),
(24, 'Upper Left First Premolar', 2),
(25, 'Upper Left Second Premolar', 2),
(26, 'Upper Left First Molar', 2),
(27, 'Upper Left Second Molar', 2),
(28, 'Upper Left Third Molar (Wisdom Tooth)', 2),
-- Quadrant 3
(31, 'Lower Left Central Incisor', 3),
(32, 'Lower Left Lateral Incisor', 3),
(33, 'Lower Left Canine', 3),
(34, 'Lower Left First Premolar', 3),
(35, 'Lower Left Second Premolar', 3),
(36, 'Lower Left First Molar', 3),
(37, 'Lower Left Second Molar', 3),
(38, 'Lower Left Third Molar (Wisdom Tooth)', 3),
-- Quadrant 4
(41, 'Lower Right Central Incisor', 4),
(42, 'Lower Right Lateral Incisor', 4),
(43, 'Lower Right Canine', 4),
(44, 'Lower Right First Premolar', 4),
(45, 'Lower Right Second Premolar', 4),
(46, 'Lower Right First Molar', 4),
(47, 'Lower Right Second Molar', 4),
(48, 'Lower Right Third Molar (Wisdom Tooth)', 4);

-- Optional: Add indexes if needed for performance, e.g., on quadrant
-- CREATE INDEX idx_teeth_quadrant ON public.teeth(quadrant);
