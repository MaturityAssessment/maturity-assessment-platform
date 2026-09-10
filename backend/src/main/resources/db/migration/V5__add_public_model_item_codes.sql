ALTER TABLE practices ADD COLUMN IF NOT EXISTS code VARCHAR(255);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS code VARCHAR(255);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS depends_on_question_code VARCHAR(255);

UPDATE practices
SET code = 'P' || id
WHERE code IS NULL OR BTRIM(code) = '';

UPDATE questions
SET code = 'Q' || id
WHERE code IS NULL OR BTRIM(code) = '';

UPDATE questions child
SET depends_on_question_code = parent.code
FROM questions parent
WHERE child.depends_on_question_code IS NULL
  AND child.depends_on_question_id ~ '^[0-9]+$'
  AND parent.id = child.depends_on_question_id::BIGINT;

ALTER TABLE practices ALTER COLUMN code SET NOT NULL;
ALTER TABLE questions ALTER COLUMN code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practices_code ON practices (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_questions_code ON questions (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_questions_dependency_code
    ON questions (LOWER(depends_on_question_code));
