CREATE OR REPLACE FUNCTION migration_item_initials(source_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT STRING_AGG(UPPER(LEFT(part, 1)), '' ORDER BY ordinal)
    INTO result
    FROM REGEXP_SPLIT_TO_TABLE(COALESCE(BTRIM(source_text), ''), '[^A-Za-z0-9]+')
         WITH ORDINALITY AS words(part, ordinal)
    WHERE part <> ''
      AND ordinal <= 5;

    RETURN COALESCE(NULLIF(result, ''), 'ITEM');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Capture the canonical parent IDs before codes are regenerated.
CREATE TEMP TABLE migration_question_dependencies (
    child_id BIGINT PRIMARY KEY,
    parent_id BIGINT NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
    child RECORD;
    parent_from_id BIGINT;
    parent_from_id_practice BIGINT;
    parent_from_code BIGINT;
    resolved_parent BIGINT;
    source_position INTEGER;
    candidate_count INTEGER;
BEGIN
    FOR child IN
        SELECT id, practice_id, depends_on_question_id, depends_on_question_code
        FROM questions
        WHERE NULLIF(BTRIM(depends_on_question_id), '') IS NOT NULL
           OR NULLIF(BTRIM(depends_on_question_code), '') IS NOT NULL
        ORDER BY id
    LOOP
        parent_from_id := NULL;
        parent_from_id_practice := NULL;
        parent_from_code := NULL;
        resolved_parent := NULL;

        IF NULLIF(BTRIM(child.depends_on_question_id), '') IS NOT NULL THEN
            IF BTRIM(child.depends_on_question_id) !~ '^[0-9]+$' THEN
                RAISE EXCEPTION
                    'Legacy question % has non-numeric dependency id %',
                    child.id, child.depends_on_question_id;
            END IF;

            SELECT id, practice_id INTO parent_from_id, parent_from_id_practice
            FROM questions
            WHERE id = BTRIM(child.depends_on_question_id)::BIGINT;

            IF parent_from_id IS NULL THEN
                RAISE EXCEPTION
                    'Legacy question % references missing dependency id %',
                    child.id, child.depends_on_question_id;
            END IF;
        END IF;

        IF NULLIF(BTRIM(child.depends_on_question_code), '') IS NOT NULL THEN
            SELECT COUNT(*), MIN(id)
            INTO candidate_count, parent_from_code
            FROM questions
            WHERE practice_id = child.practice_id
              AND LOWER(code) = LOWER(BTRIM(child.depends_on_question_code));

            IF candidate_count > 1 THEN
                RAISE EXCEPTION
                    'Legacy question % has ambiguous dependency code % in practice %',
                    child.id, child.depends_on_question_code, child.practice_id;
            END IF;

            IF candidate_count = 0 AND parent_from_id IS NULL THEN
                RAISE EXCEPTION
                    'Legacy question % references missing dependency code % in practice %',
                    child.id, child.depends_on_question_code, child.practice_id;
            END IF;
        END IF;

        IF parent_from_id IS NOT NULL AND parent_from_id_practice = child.practice_id THEN
            IF NULLIF(BTRIM(child.depends_on_question_code), '') IS NOT NULL
               AND parent_from_code IS DISTINCT FROM parent_from_id THEN
                RAISE EXCEPTION
                    'Legacy question % has conflicting dependency id % and code %',
                    child.id, child.depends_on_question_id, child.depends_on_question_code;
            END IF;
            resolved_parent := parent_from_id;
        ELSIF parent_from_code IS NOT NULL THEN
            resolved_parent := parent_from_code;
        ELSIF parent_from_id IS NOT NULL THEN
            -- Repair the historical cross-version bug by finding the equivalent
            -- sibling in the child's own practice. Prefer exact text/type; use the
            -- source sibling position only when it identifies one candidate.
            SELECT COUNT(*), MIN(candidate.id)
            INTO candidate_count, resolved_parent
            FROM questions source
            JOIN questions candidate
              ON candidate.practice_id = child.practice_id
             AND LOWER(BTRIM(candidate.type)) = LOWER(BTRIM(source.type))
             AND REGEXP_REPLACE(LOWER(BTRIM(candidate.text)), '\s+', ' ', 'g')
                 = REGEXP_REPLACE(LOWER(BTRIM(source.text)), '\s+', ' ', 'g')
            WHERE source.id = parent_from_id;

            IF candidate_count = 0 THEN
                SELECT COUNT(*) - 1 INTO source_position
                FROM questions source_sibling
                JOIN questions source_parent
                  ON source_parent.id = parent_from_id
                 AND source_sibling.practice_id = source_parent.practice_id
                WHERE source_sibling.id <= source_parent.id;

                SELECT COUNT(*), MIN(candidate.id)
                INTO candidate_count, resolved_parent
                FROM (
                    SELECT q.id, q.type,
                           ROW_NUMBER() OVER (PARTITION BY q.practice_id ORDER BY q.id) - 1 AS position
                    FROM questions q
                    WHERE q.practice_id = child.practice_id
                ) candidate
                JOIN questions source ON source.id = parent_from_id
                WHERE candidate.position = source_position
                  AND LOWER(BTRIM(candidate.type)) = LOWER(BTRIM(source.type));
            END IF;

            IF candidate_count <> 1 THEN
                RAISE EXCEPTION
                    'Cannot safely repair dependency for question %: parent % belongs to another practice and % local candidates matched',
                    child.id, parent_from_id, candidate_count;
            END IF;
        END IF;

        IF resolved_parent = child.id THEN
            RAISE EXCEPTION 'Question % cannot depend on itself', child.id;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM questions parent
            WHERE parent.id = resolved_parent
              AND parent.practice_id = child.practice_id
              AND LOWER(parent.type) IN ('boolean', 'boolean_justification')
        ) THEN
            RAISE EXCEPTION
                'Question % dependency % is not a boolean question in the same practice',
                child.id, resolved_parent;
        END IF;

        INSERT INTO migration_question_dependencies(child_id, parent_id)
        VALUES (child.id, resolved_parent);
    END LOOP;

    IF EXISTS (
        WITH RECURSIVE dependency_path AS (
            SELECT child_id AS root_child,
                   parent_id,
                   ARRAY[child_id] AS path,
                   parent_id = child_id AS cyclic
            FROM migration_question_dependencies

            UNION ALL

            SELECT dependency_path.root_child,
                   dependency.parent_id,
                   dependency_path.path || dependency_path.parent_id,
                   dependency.parent_id = ANY(
                       dependency_path.path || dependency_path.parent_id
                   )
            FROM dependency_path
            JOIN migration_question_dependencies dependency
              ON dependency.child_id = dependency_path.parent_id
            WHERE NOT dependency_path.cyclic
        )
        SELECT 1
        FROM dependency_path
        WHERE cyclic
    ) THEN
        RAISE EXCEPTION 'Legacy question dependencies contain a cycle';
    END IF;
END;
$$;

-- Fill genuinely missing dimension/module identifiers without changing existing
-- identifiers embedded in historical assessment response keys.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY maturity_model_id ORDER BY sort_order, id) AS ordinal
    FROM dimensions
)
UPDATE dimensions target
SET dimension_id = 'D' || ranked.ordinal || '_'
                   || migration_item_initials(target.name)
FROM ranked
WHERE target.id = ranked.id
  AND NULLIF(BTRIM(target.dimension_id), '') IS NULL;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY dimension_id ORDER BY sort_order, id) AS ordinal
    FROM modules
)
UPDATE modules target
SET code = 'M' || ranked.ordinal || '_' || migration_item_initials(target.name)
FROM ranked
WHERE target.id = ranked.id
  AND NULLIF(BTRIM(target.code), '') IS NULL;

-- V5 used database IDs as temporary codes. Replace only those generated values.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY module_id ORDER BY id) AS ordinal
    FROM practices
)
UPDATE practices target
SET code = 'P' || ranked.ordinal || '_' || migration_item_initials(target.name)
FROM ranked
WHERE target.id = ranked.id
  AND (NULLIF(BTRIM(target.code), '') IS NULL OR target.code ~* '^P[0-9]+$');

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY practice_id ORDER BY id) AS ordinal
    FROM questions
)
UPDATE questions target
SET code = 'Q' || ranked.ordinal || '_' || migration_item_initials(target.text)
FROM ranked
WHERE target.id = ranked.id
  AND (NULLIF(BTRIM(target.code), '') IS NULL OR target.code ~* '^Q[0-9]+$');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dimensions
        GROUP BY maturity_model_id, LOWER(dimension_id)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate dimension codes exist within a maturity model';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM modules
        GROUP BY dimension_id, LOWER(code)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate module codes exist within a dimension';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM practices
        GROUP BY module_id, LOWER(code)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate practice codes exist within a module';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM questions
        GROUP BY practice_id, LOWER(code)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate question codes exist within a practice';
    END IF;
END;
$$;

UPDATE questions SET depends_on_question_id = NULL;

UPDATE questions child
SET depends_on_question_id = dependency.parent_id::TEXT,
    depends_on_question_code = parent.code
FROM migration_question_dependencies dependency
JOIN questions parent ON parent.id = dependency.parent_id
WHERE child.id = dependency.child_id;

ALTER TABLE questions
    ALTER COLUMN depends_on_question_id TYPE BIGINT
    USING NULLIF(BTRIM(depends_on_question_id), '')::BIGINT;

ALTER TABLE questions
    ADD CONSTRAINT fk_questions_dependency
        FOREIGN KEY (depends_on_question_id) REFERENCES questions(id) ON DELETE SET NULL;

ALTER TABLE dimensions
    ALTER COLUMN description DROP NOT NULL;

DROP INDEX IF EXISTS idx_practices_code;
DROP INDEX IF EXISTS idx_questions_code;
DROP INDEX IF EXISTS idx_questions_dependency_code;

CREATE UNIQUE INDEX ux_dimensions_model_code
    ON dimensions (maturity_model_id, LOWER(dimension_id));
CREATE UNIQUE INDEX ux_modules_dimension_code
    ON modules (dimension_id, LOWER(code));
CREATE UNIQUE INDEX ux_practices_module_code
    ON practices (module_id, LOWER(code));
CREATE UNIQUE INDEX ux_questions_practice_code
    ON questions (practice_id, LOWER(code));

ALTER TABLE dimensions
    ADD CONSTRAINT chk_dimensions_public_code
        CHECK (BTRIM(dimension_id) <> '');
ALTER TABLE modules
    ADD CONSTRAINT chk_modules_public_code
        CHECK (BTRIM(code) <> '');
ALTER TABLE practices
    ADD CONSTRAINT chk_practices_public_code
        CHECK (BTRIM(code) <> '');
ALTER TABLE questions
    ADD CONSTRAINT chk_questions_public_code
        CHECK (BTRIM(code) <> '');

ALTER TABLE questions DROP COLUMN depends_on_question_code;
DROP FUNCTION migration_item_initials(TEXT);
