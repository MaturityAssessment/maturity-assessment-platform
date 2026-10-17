\set ON_ERROR_STOP on
-- Run against a disposable database initialized with the current entity schema.
-- All setup, migration execution, and test rows are rolled back.
BEGIN;
ALTER TABLE questions DROP COLUMN dependency_condition;
INSERT INTO questions (id, code, type, text, weight, sort_order, required,
  boolean_correct_answer, range_min, range_max, range_high_value_is_maximum,
  scale_point_count, scale_high_point_is_maximum, created_at)
VALUES (9000001, 'MIGRATION_PARENT', 'boolean', 'Parent', 1, 0, false, true, 0, 100, true, 5, true, now()),
       (9000002, 'MIGRATION_CHILD', 'boolean', 'Child', 1, 1, false, true, 0, 100, true, 5, true, now()),
       (9000003, 'MIGRATION_CHOICE', 'multiple_choice', 'Choice', 1, 2, false, true, 0, 100, true, 5, true, now()),
       (9000004, 'MIGRATION_EMPTY', 'multiple_choice', 'Empty legacy choice', 1, 3, false, true, 0, 100, true, 5, true, now());
UPDATE questions SET choice_options = '[]' WHERE id = 9000004;
UPDATE questions SET depends_on_question_id = 9000001 WHERE id = 9000002;
UPDATE questions SET choice_options = '[{"label":"A","score":0},{"id":"keep-me","label":"B","score":0},{"label":"C","score":1}]' WHERE id = 9000003;
\ir ../../../main/resources/db/migration/V41__add_question_dependency_conditions.sql
DO $$
DECLARE options jsonb;
BEGIN
    IF (SELECT dependency_condition::jsonb FROM questions WHERE id = 9000002)
       IS DISTINCT FROM '{"type":"boolean","answers":[true]}'::jsonb THEN
        RAISE EXCEPTION 'Legacy Yes dependency was not preserved';
    END IF;
    IF (SELECT choice_options FROM questions WHERE id = 9000004) IS DISTINCT FROM '[]' THEN
        RAISE EXCEPTION 'Empty legacy option array changed unexpectedly';
    END IF;
    SELECT choice_options::jsonb INTO options FROM questions WHERE id = 9000003;
    IF options->0->>'id' <> 'option-9000003-1' OR options->1->>'id' <> 'keep-me'
       OR options->2->>'id' <> 'option-9000003-3'
       OR ((options->0) - 'id') <> '{"label":"A","score":0}'::jsonb
       OR ((options->1) - 'id') <> '{"label":"B","score":0}'::jsonb
       OR ((options->2) - 'id') <> '{"label":"C","score":1}'::jsonb THEN
        RAISE EXCEPTION 'Choice identity, order, or scores changed unexpectedly';
    END IF;
END $$;
ROLLBACK;
