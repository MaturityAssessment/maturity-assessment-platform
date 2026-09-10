ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS scale_point_count INTEGER,
    ADD COLUMN IF NOT EXISTS scale_min_label VARCHAR(50),
    ADD COLUMN IF NOT EXISTS scale_max_label VARCHAR(50),
    ADD COLUMN IF NOT EXISTS scale_high_point_is_maximum BOOLEAN;

UPDATE questions q
SET scale_point_count = COALESCE(
        q.likert_scale_max,
        NULLIF((
            SELECT COUNT(*)::INTEGER
            FROM maturity_levels ml
            JOIN maturity_models mm ON mm.id = ml.maturity_model_id
            JOIN dimensions d ON d.maturity_model_id = mm.id
            JOIN modules m ON m.dimension_id = d.id
            JOIN practices p ON p.module_id = m.id
            WHERE p.id = q.practice_id
        ), 0),
        5
    ),
    scale_high_point_is_maximum = TRUE
WHERE lower(q.type) = 'likert'
  AND (q.scale_point_count IS NULL OR q.scale_high_point_is_maximum IS NULL);

UPDATE questions
SET scale_point_count = 5
WHERE scale_point_count IS NULL;

UPDATE questions
SET scale_high_point_is_maximum = TRUE
WHERE scale_high_point_is_maximum IS NULL;

ALTER TABLE questions
    ALTER COLUMN scale_point_count SET DEFAULT 5,
    ALTER COLUMN scale_point_count SET NOT NULL,
    ALTER COLUMN scale_high_point_is_maximum SET DEFAULT TRUE,
    ALTER COLUMN scale_high_point_is_maximum SET NOT NULL;

ALTER TABLE questions
    ADD CONSTRAINT ck_questions_scale_point_count
        CHECK (scale_point_count BETWEEN 2 AND 100);

ALTER TABLE question_evaluations
    DROP CONSTRAINT IF EXISTS ck_question_evaluation_initial_score;

ALTER TABLE question_evaluations
    ALTER COLUMN initial_score TYPE DOUBLE PRECISION USING initial_score::DOUBLE PRECISION,
    ALTER COLUMN manual_score TYPE DOUBLE PRECISION USING manual_score::DOUBLE PRECISION;

ALTER TABLE question_evaluations
    ADD CONSTRAINT ck_question_evaluation_initial_score
        CHECK (initial_score IS NULL OR initial_score >= 0),
    ADD CONSTRAINT ck_question_evaluation_manual_score
        CHECK (manual_score IS NULL OR manual_score >= 0);
