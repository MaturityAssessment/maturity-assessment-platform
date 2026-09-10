ALTER TABLE questions
    ADD COLUMN range_min INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN range_max INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN range_high_value_is_maximum BOOLEAN NOT NULL DEFAULT TRUE;

WITH legacy_ranges AS (
    SELECT q.id AS question_id,
           FLOOR((q.choice_options::JSONB -> 0 ->> 'min')::NUMERIC)::INTEGER AS range_min,
           CEIL((q.choice_options::JSONB -> -1 ->> 'max')::NUMERIC)::INTEGER AS range_max,
           COALESCE(
               (q.choice_options::JSONB -> -1 ->> 'level')::INTEGER
                   >= (q.choice_options::JSONB -> 0 ->> 'level')::INTEGER,
               TRUE
           ) AS high_value_is_maximum
    FROM questions q
    WHERE lower(q.type) IN ('numeric', 'percentage')
      AND q.choice_options IS NOT NULL
      AND btrim(q.choice_options) <> ''
      AND jsonb_typeof(q.choice_options::JSONB) = 'array'
      AND jsonb_array_length(q.choice_options::JSONB) > 0
)
UPDATE questions q
SET range_min = legacy.range_min,
    range_max = CASE
        WHEN legacy.range_max > legacy.range_min THEN legacy.range_max
        ELSE legacy.range_min + 1
    END,
    range_high_value_is_maximum = legacy.high_value_is_maximum
FROM legacy_ranges legacy
WHERE q.id = legacy.question_id;

WITH question_scales AS (
    SELECT q.id AS question_id,
           q.range_min,
           q.range_max,
           q.range_high_value_is_maximum,
           GREATEST(COUNT(ml.id), 2)::DOUBLE PRECISION AS level_count
    FROM questions q
    JOIN practices p ON p.id = q.practice_id
    JOIN modules m ON m.id = p.module_id
    JOIN dimensions d ON d.id = m.dimension_id
    LEFT JOIN maturity_levels ml ON ml.maturity_model_id = d.maturity_model_id
    WHERE lower(q.type) IN ('numeric', 'percentage')
    GROUP BY q.id, q.range_min, q.range_max, q.range_high_value_is_maximum
)
UPDATE question_evaluations evaluation
SET initial_score = CASE
        WHEN evaluation.response IS NULL
             OR jsonb_typeof(evaluation.response) <> 'number'
             OR (evaluation.response #>> '{}')::DOUBLE PRECISION < scale.range_min
             OR (evaluation.response #>> '{}')::DOUBLE PRECISION > scale.range_max
            THEN NULL
        WHEN scale.range_high_value_is_maximum
            THEN ((evaluation.response #>> '{}')::DOUBLE PRECISION - scale.range_min)
                    / (scale.range_max - scale.range_min)
        ELSE 1 - (((evaluation.response #>> '{}')::DOUBLE PRECISION - scale.range_min)
                    / (scale.range_max - scale.range_min))
    END,
    manual_score = CASE
        WHEN evaluation.manual_score IS NULL THEN NULL
        ELSE GREATEST(
            0::DOUBLE PRECISION,
            LEAST(1::DOUBLE PRECISION,
                (evaluation.manual_score - 1) / (scale.level_count - 1))
        )
    END
FROM question_scales scale
WHERE evaluation.question_id = scale.question_id;

UPDATE questions
SET choice_options = NULL
WHERE lower(type) IN ('numeric', 'percentage');

ALTER TABLE questions
    ADD CONSTRAINT chk_questions_integer_range
    CHECK (range_min < range_max);
