ALTER TABLE question_evaluations
    ADD COLUMN IF NOT EXISTS respondent_updated BOOLEAN NOT NULL DEFAULT FALSE;

