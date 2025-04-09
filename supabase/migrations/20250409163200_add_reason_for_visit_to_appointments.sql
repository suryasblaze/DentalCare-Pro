-- Add reason_for_visit column to appointments table
ALTER TABLE appointments 
ADD COLUMN reason_for_visit TEXT;
