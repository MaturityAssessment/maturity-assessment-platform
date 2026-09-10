ALTER TABLE question_evaluations
    ADD COLUMN IF NOT EXISTS response JSONB,
    ADD COLUMN IF NOT EXISTS initial_score INTEGER,
    ADD COLUMN IF NOT EXISTS respondent_justification TEXT;

ALTER TABLE question_evaluations
    ALTER COLUMN validation_status DROP NOT NULL;

DO $$
DECLARE
    assessment_row RECORD;
BEGIN
    FOR assessment_row IN
        SELECT id, responses
        FROM assessments
        WHERE responses IS NOT NULL
          AND btrim(responses) <> ''
    LOOP
        BEGIN
            PERFORM assessment_row.responses::jsonb;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION
                'Assessment % contains invalid responses JSON and cannot be migrated',
                assessment_row.id;
        END;
    END LOOP;
END
$$;

CREATE TEMP TABLE migrated_question_responses ON COMMIT DROP AS
SELECT
    a.id AS assessment_id,
    a.status,
    a.maturity_model_id,
    answer.key AS response_key,
    q.id AS question_id,
    q.type AS question_type,
    q.choice_options,
    q.likert_scale_max,
    answer.value AS response,
    legacy_document ->> (answer.key || '_justification') AS respondent_justification
FROM assessments a
CROSS JOIN LATERAL (
    SELECT COALESCE(NULLIF(a.responses, ''), '{}')::jsonb AS legacy_document
) document
CROSS JOIN LATERAL jsonb_each(document.legacy_document) answer
JOIN questions q
    ON q.id = substring(answer.key FROM '_([0-9]+)$')::BIGINT
JOIN practices p ON p.id = q.practice_id
JOIN modules m ON m.id = p.module_id
JOIN dimensions d ON d.id = m.dimension_id
WHERE answer.key NOT LIKE '%\_justification' ESCAPE '\'
  AND d.maturity_model_id = a.maturity_model_id;

DO $$
DECLARE
    source_count BIGINT;
    migrated_count BIGINT;
    duplicate_count BIGINT;
BEGIN
    SELECT count(*)
    INTO source_count
    FROM assessments a
    CROSS JOIN LATERAL jsonb_each(
        COALESCE(NULLIF(a.responses, ''), '{}')::jsonb
    ) answer
    WHERE answer.key NOT LIKE '%\_justification' ESCAPE '\';

    SELECT count(*) INTO migrated_count FROM migrated_question_responses;

    IF source_count <> migrated_count THEN
        RAISE EXCEPTION
            'Question-response migration aborted: % source answers but % resolvable answers',
            source_count,
            migrated_count;
    END IF;

    SELECT count(*)
    INTO duplicate_count
    FROM (
        SELECT assessment_id, question_id
        FROM migrated_question_responses
        GROUP BY assessment_id, question_id
        HAVING count(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION
            'Question-response migration aborted: % duplicate assessment/question pairs',
            duplicate_count;
    END IF;
END
$$;

INSERT INTO question_evaluations (
    assessment_id,
    response_key,
    question_id,
    response,
    initial_score,
    respondent_justification,
    validation_status,
    created_at,
    updated_at
)
SELECT
    migrated.assessment_id,
    migrated.response_key,
    migrated.question_id,
    migrated.response,
    NULL,
    NULLIF(btrim(migrated.respondent_justification), ''),
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM migrated_question_responses migrated
ON CONFLICT (assessment_id, response_key) DO UPDATE
SET question_id = EXCLUDED.question_id,
    response = EXCLUDED.response,
    initial_score = NULL,
    respondent_justification = EXCLUDED.respondent_justification,
    updated_at = CURRENT_TIMESTAMP;

WITH model_maximums AS (
    SELECT
        mm.id AS maturity_model_id,
        COALESCE(max(ml.number), 5) AS max_level
    FROM maturity_models mm
    LEFT JOIN maturity_levels ml ON ml.maturity_model_id = mm.id
    GROUP BY mm.id
),
score_inputs AS (
    SELECT
        migrated.*,
        maximums.max_level,
        migrated.response #>> '{}' AS response_text,
        CASE
            WHEN jsonb_typeof(migrated.response) = 'number'
                THEN (migrated.response #>> '{}')::NUMERIC
            WHEN jsonb_typeof(migrated.response) = 'string'
                 AND (migrated.response #>> '{}') ~ '^-?[0-9]+([.][0-9]+)?$'
                THEN (migrated.response #>> '{}')::NUMERIC
            ELSE NULL
        END AS numeric_value
    FROM migrated_question_responses migrated
    JOIN model_maximums maximums
        ON maximums.maturity_model_id = migrated.maturity_model_id
),
computed_scores AS (
    SELECT
        input.assessment_id,
        input.response_key,
        CASE
            WHEN input.status = 'DRAFT' THEN NULL
            WHEN lower(input.question_type) = 'boolean' THEN
                CASE
                    WHEN jsonb_typeof(input.response) = 'boolean'
                        THEN CASE WHEN input.response_text = 'true' THEN input.max_level ELSE 1 END
                    WHEN lower(input.response_text) IN ('true', 'yes')
                        THEN input.max_level
                    WHEN lower(input.response_text) IN ('false', 'no')
                        THEN 1
                    WHEN input.numeric_value IS NOT NULL
                        THEN CASE
                            WHEN trunc(input.numeric_value)::INTEGER = 0 THEN 1
                            WHEN trunc(input.numeric_value)::INTEGER = 1 THEN input.max_level
                            WHEN trunc(input.numeric_value)::INTEGER BETWEEN 1 AND input.max_level
                                THEN trunc(input.numeric_value)::INTEGER
                            ELSE NULL
                        END
                    ELSE NULL
                END
            WHEN lower(input.question_type) = 'likert'
                 AND input.numeric_value IS NOT NULL
                 AND trunc(input.numeric_value)::INTEGER BETWEEN 1
                     AND LEAST(COALESCE(input.likert_scale_max, input.max_level), input.max_level)
                THEN trunc(input.numeric_value)::INTEGER
            WHEN lower(input.question_type) = 'multiple_choice'
                 AND input.numeric_value IS NOT NULL
                 AND trunc(input.numeric_value)::INTEGER BETWEEN 1 AND input.max_level
                 AND (
                     input.choice_options IS NULL
                     OR btrim(input.choice_options) = ''
                     OR EXISTS (
                         SELECT 1
                         FROM jsonb_array_elements(input.choice_options::jsonb) choice
                         WHERE (choice ->> 'level')::INTEGER = trunc(input.numeric_value)::INTEGER
                     )
                 )
                THEN trunc(input.numeric_value)::INTEGER
            WHEN lower(input.question_type) IN ('numeric', 'percentage')
                 AND input.numeric_value IS NOT NULL
                 AND input.choice_options IS NOT NULL
                 AND btrim(input.choice_options) <> ''
                THEN (
                    SELECT (configured_range.value ->> 'level')::INTEGER
                    FROM jsonb_array_elements(input.choice_options::jsonb)
                        WITH ORDINALITY configured_range(value, position)
                    WHERE input.numeric_value >= (configured_range.value ->> 'min')::NUMERIC
                      AND (
                          input.numeric_value < (configured_range.value ->> 'max')::NUMERIC
                          OR (
                              configured_range.position = jsonb_array_length(input.choice_options::jsonb)
                              AND input.numeric_value <= (configured_range.value ->> 'max')::NUMERIC
                          )
                      )
                    ORDER BY configured_range.position
                    LIMIT 1
                )
            ELSE NULL
        END AS initial_score
    FROM score_inputs input
)
UPDATE question_evaluations evaluation
SET initial_score = computed.initial_score
FROM computed_scores computed
WHERE evaluation.assessment_id = computed.assessment_id
  AND evaluation.response_key = computed.response_key;

DO $$
DECLARE
    migrated_count BIGINT;
    persisted_count BIGINT;
    missing_question_count BIGINT;
BEGIN
    SELECT count(*) INTO migrated_count FROM migrated_question_responses;

    SELECT count(*)
    INTO persisted_count
    FROM question_evaluations evaluation
    JOIN migrated_question_responses migrated
      ON migrated.assessment_id = evaluation.assessment_id
     AND migrated.response_key = evaluation.response_key
    WHERE evaluation.response IS NOT NULL;

    IF migrated_count <> persisted_count THEN
        RAISE EXCEPTION
            'Question-response migration aborted: % staged answers but % persisted answers',
            migrated_count,
            persisted_count;
    END IF;

    SELECT count(*)
    INTO missing_question_count
    FROM question_evaluations
    WHERE question_id IS NULL;

    IF missing_question_count > 0 THEN
        RAISE EXCEPTION
            'Question-response migration aborted: % evaluation rows have no question_id',
            missing_question_count;
    END IF;
END
$$;

ALTER TABLE question_evaluations
    ALTER COLUMN question_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_question_evaluations_question'
          AND conrelid = 'question_evaluations'::regclass
    ) THEN
        ALTER TABLE question_evaluations
            ADD CONSTRAINT fk_question_evaluations_question
            FOREIGN KEY (question_id)
            REFERENCES questions(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_question_evaluation_assessment_question'
          AND conrelid = 'question_evaluations'::regclass
    ) THEN
        ALTER TABLE question_evaluations
            ADD CONSTRAINT uk_question_evaluation_assessment_question
            UNIQUE (assessment_id, question_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_question_evaluation_initial_score'
          AND conrelid = 'question_evaluations'::regclass
    ) THEN
        ALTER TABLE question_evaluations
            ADD CONSTRAINT ck_question_evaluation_initial_score
            CHECK (initial_score IS NULL OR initial_score >= 1);
    END IF;
END
$$;

ALTER TABLE assessments
    DROP COLUMN responses;
