\set ON_ERROR_STOP on
-- Run with psql against a disposable PostgreSQL database; the fixture is rolled back.
BEGIN;
CREATE SCHEMA score_limits_migration_test;
SET LOCAL search_path TO score_limits_migration_test;
CREATE TABLE practices (id bigint PRIMARY KEY, score double precision);
CREATE TABLE modules (LIKE practices INCLUDING ALL);
CREATE TABLE dimensions (LIKE practices INCLUDING ALL);
INSERT INTO practices VALUES (1, 0.42);
INSERT INTO modules VALUES (1, 0.42);
INSERT INTO dimensions VALUES (1, 0.42);
\ir ../../../main/resources/db/migration/V58__add_score_limits.sql
DO $$
DECLARE
    owner_table text;
    actual_limits jsonb;
    actual_score double precision;
BEGIN
    FOREACH owner_table IN ARRAY ARRAY['practices', 'modules', 'dimensions'] LOOP
        EXECUTE format('SELECT score, score_limits FROM %I WHERE id = 1', owner_table)
            INTO actual_score, actual_limits;
        IF actual_score IS DISTINCT FROM 0.42::double precision OR actual_limits IS DISTINCT FROM '[]'::jsonb THEN
            RAISE EXCEPTION 'Migration changed legacy score or failed to default limits on %', owner_table;
        END IF;
        EXECUTE format('INSERT INTO %I (id, score) VALUES (2, 0.7)', owner_table);
        EXECUTE format('SELECT score_limits FROM %I WHERE id = 2', owner_table) INTO actual_limits;
        IF actual_limits IS DISTINCT FROM '[]'::jsonb THEN
            RAISE EXCEPTION 'Missing default limits for new rows on %', owner_table;
        END IF;
        BEGIN
            EXECUTE format('UPDATE %I SET score_limits = NULL WHERE id = 2', owner_table);
            RAISE EXCEPTION 'Null score limits unexpectedly accepted on %', owner_table;
        EXCEPTION WHEN not_null_violation THEN NULL;
        END;
    END LOOP;
END $$;
ROLLBACK;
