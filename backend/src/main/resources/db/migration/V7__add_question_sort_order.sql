ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ordered_questions AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY practice_id
               ORDER BY id
           ) - 1 AS next_sort_order
    FROM questions
)
UPDATE questions q
SET sort_order = oq.next_sort_order
FROM ordered_questions oq
WHERE q.id = oq.id
  AND q.sort_order IS NULL;

UPDATE questions
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE questions
    ALTER COLUMN sort_order SET DEFAULT 0,
    ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_practice_sort_order
    ON questions (practice_id, sort_order, id);
