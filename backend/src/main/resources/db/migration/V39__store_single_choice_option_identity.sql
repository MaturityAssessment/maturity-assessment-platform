-- Hibernate schema updates may have already added this nullable column locally.
ALTER TABLE question_evaluations ADD COLUMN IF NOT EXISTS choice_index INTEGER;
