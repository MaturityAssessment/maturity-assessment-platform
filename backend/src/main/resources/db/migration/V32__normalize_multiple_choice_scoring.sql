WITH question_scales AS (
    SELECT q.id AS question_id,
           GREATEST(COUNT(ml.id), 2)::NUMERIC AS level_count
    FROM questions q
    JOIN practices p ON p.id = q.practice_id
    JOIN modules m ON m.id = p.module_id
    JOIN dimensions d ON d.id = m.dimension_id
    LEFT JOIN maturity_levels ml ON ml.maturity_model_id = d.maturity_model_id
    WHERE lower(q.type) = 'multiple_choice'
    GROUP BY q.id
), transformed AS (
    SELECT q.id AS question_id,
           jsonb_agg(
               CASE
                   WHEN option.value ? 'score' THEN option.value - 'level'
                   ELSE (option.value - 'level') || jsonb_build_object(
                       'score', GREATEST(
                           0::NUMERIC,
                           LEAST(
                               1::NUMERIC,
                               ((option.value ->> 'level')::NUMERIC - 1)
                                   / (scale.level_count - 1)
                           )
                       )
                   )
               END
               ORDER BY option.ordinality
           ) AS options
    FROM questions q
    JOIN question_scales scale ON scale.question_id = q.id
    CROSS JOIN LATERAL jsonb_array_elements(q.choice_options::JSONB)
         WITH ORDINALITY AS option(value, ordinality)
    WHERE q.choice_options IS NOT NULL
      AND btrim(q.choice_options) <> ''
    GROUP BY q.id
)
UPDATE questions q
SET choice_options = transformed.options::TEXT
FROM transformed
WHERE q.id = transformed.question_id;

WITH question_scales AS (
    SELECT q.id AS question_id,
           GREATEST(COUNT(ml.id), 2)::DOUBLE PRECISION AS level_count
    FROM questions q
    JOIN practices p ON p.id = q.practice_id
    JOIN modules m ON m.id = p.module_id
    JOIN dimensions d ON d.id = m.dimension_id
    LEFT JOIN maturity_levels ml ON ml.maturity_model_id = d.maturity_model_id
    WHERE lower(q.type) = 'multiple_choice'
    GROUP BY q.id
)
UPDATE question_evaluations evaluation
SET response = CASE
        WHEN jsonb_typeof(evaluation.response) = 'number'
            THEN to_jsonb(GREATEST(
                0::DOUBLE PRECISION,
                LEAST(
                    1::DOUBLE PRECISION,
                    ((evaluation.response #>> '{}')::DOUBLE PRECISION - 1)
                        / (scale.level_count - 1)
                )
            ))
        ELSE evaluation.response
    END,
    initial_score = CASE
        WHEN evaluation.initial_score IS NULL THEN NULL
        ELSE GREATEST(
            0::DOUBLE PRECISION,
            LEAST(1::DOUBLE PRECISION,
                (evaluation.initial_score - 1) / (scale.level_count - 1))
        )
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
