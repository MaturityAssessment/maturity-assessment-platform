package com.master_thesis.maturity_assessment.assessments.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/** Uses an isolated schema and rolls back; never changes application tables. */
@EnabledIfEnvironmentVariable(named = "EVIDENCE_MIGRATION_TEST_DATABASE", matches = ".+")
class EvidenceQuestionReferencesMigrationTest {
    @Test
    void preservesEvidenceAndEnforcesReferenceLifecycle() throws Exception {
        String migration;
        try (var input = getClass().getResourceAsStream("/db/migration/V44__add_evidence_question_references.sql")) {
            assertNotNull(input);
            migration = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String fixture = """
                BEGIN;
                CREATE SCHEMA issue14_reference_migration_test;
                SET LOCAL search_path = issue14_reference_migration_test;
                CREATE TABLE evidence (id bigint PRIMARY KEY, practice_id bigint, file_path text);
                CREATE TABLE questions (id bigint PRIMARY KEY, practice_id bigint);
                INSERT INTO evidence VALUES (1, 10, 'unchanged/policy.pdf'), (2, 10, 'another.pdf');
                INSERT INTO questions VALUES (100, 10), (101, 10);
                """;
        String assertions = """
                DO $$ BEGIN
                  IF (SELECT count(*) FROM evidence) <> 2
                     OR (SELECT file_path FROM evidence WHERE id=1) <> 'unchanged/policy.pdf'
                     OR EXISTS (SELECT 1 FROM evidence_question_references)
                  THEN RAISE EXCEPTION 'Historical evidence changed'; END IF;
                END $$;
                INSERT INTO evidence_question_references VALUES (1,100), (1,101), (2,100);
                DO $$ BEGIN
                  BEGIN
                    INSERT INTO evidence_question_references VALUES (1,100);
                    RAISE EXCEPTION 'Duplicate reference accepted';
                  EXCEPTION WHEN unique_violation THEN NULL; END;
                  BEGIN
                    INSERT INTO evidence_question_references VALUES (99,100);
                    RAISE EXCEPTION 'Unknown evidence accepted';
                  EXCEPTION WHEN integrity_constraint_violation THEN NULL; END;
                  BEGIN
                    INSERT INTO evidence_question_references VALUES (1,999);
                    RAISE EXCEPTION 'Unknown question accepted';
                  EXCEPTION WHEN integrity_constraint_violation THEN NULL; END;
                  BEGIN
                    DELETE FROM questions WHERE id=100;
                    RAISE EXCEPTION 'Referenced question deleted';
                  EXCEPTION WHEN integrity_constraint_violation THEN NULL; END;
                END $$;
                DELETE FROM evidence WHERE id=1;
                DO $$ BEGIN
                  IF (SELECT count(*) FROM evidence_question_references) <> 1
                    OR (SELECT count(*) FROM questions) <> 2
                  THEN RAISE EXCEPTION 'Evidence deletion damaged references/questions'; END IF;
                END $$;
                DELETE FROM evidence WHERE id=2;
                DELETE FROM questions WHERE id=100;
                ROLLBACK;
                """;
        Process process = new ProcessBuilder("psql", "-X", "-v", "ON_ERROR_STOP=1",
                "-U", System.getenv().getOrDefault("EVIDENCE_MIGRATION_TEST_USER", "postgres"),
                "-d", System.getenv("EVIDENCE_MIGRATION_TEST_DATABASE"))
                .redirectErrorStream(true).start();
        try (var output = process.getOutputStream()) {
            output.write((fixture + migration + assertions).getBytes(StandardCharsets.UTF_8));
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertEquals(0, process.waitFor(), output);
    }
}
