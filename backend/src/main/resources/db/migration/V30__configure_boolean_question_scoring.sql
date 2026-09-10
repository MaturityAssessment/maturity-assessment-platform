ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS boolean_correct_answer BOOLEAN;

UPDATE questions
SET boolean_correct_answer = TRUE
WHERE boolean_correct_answer IS NULL;

ALTER TABLE questions
    ALTER COLUMN boolean_correct_answer SET DEFAULT TRUE,
    ALTER COLUMN boolean_correct_answer SET NOT NULL;
