package com.master_thesis.maturity_assessment.assessments.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

/** Runs against an isolated schema and rolls back without modifying app tables. */
@EnabledIfEnvironmentVariable(named = "EVIDENCE_MIGRATION_TEST_DATABASE", matches = ".+")
class EvidenceLifecycleMigrationTest {
    @Test
    void preservesScoresAndDatesAndLabelsInferredLegacyReferenceDates() throws Exception {
        String migration;
        try (var input = getClass().getResourceAsStream("/db/migration/V50__add_evidence_lifecycle.sql")) {
            assertNotNull(input); migration = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String fixture = """
                BEGIN;
                CREATE SCHEMA evidence_lifecycle_migration_test;
                SET LOCAL search_path = evidence_lifecycle_migration_test;
                CREATE TABLE practice_evidence_requirements (code TEXT);
                CREATE TABLE evidence (id BIGINT, evidence_date DATE);
                CREATE TABLE assessments (id BIGINT, created_at TIMESTAMP, overall_average NUMERIC, status TEXT);
                INSERT INTO evidence VALUES (1, '2026-10-31'), (2, NULL);
                INSERT INTO practice_evidence_requirements VALUES ('report');
                INSERT INTO assessments VALUES (10, '2026-11-04 10:00:00', 3.75, 'COMPLETED');
                """;
        String assertions = """
                DO $$ BEGIN
                  IF (SELECT collected_at FROM evidence WHERE id=1) <> '2026-10-31'::date
                    OR (SELECT collected_at FROM evidence WHERE id=2) IS NOT NULL
                    OR (SELECT reference_date FROM assessments) <> '2026-11-04'::date
                    OR NOT (SELECT reference_date_inferred FROM assessments)
                    OR (SELECT overall_average FROM assessments) <> 3.75
                    OR (SELECT status FROM assessments) <> 'COMPLETED'
                    OR (SELECT frequency FROM practice_evidence_requirements) <> 'adhoc'
                    OR (SELECT max_age_days FROM practice_evidence_requirements) IS NOT NULL
                  THEN RAISE EXCEPTION 'Lifecycle migration changed historical facts'; END IF;
                  BEGIN
                    UPDATE practice_evidence_requirements SET max_age_days=-1;
                    RAISE EXCEPTION 'Negative age accepted';
                  EXCEPTION WHEN check_violation THEN NULL; END;
                END $$;
                ROLLBACK;
                """;
        Process process = new ProcessBuilder("psql", "-X", "-v", "ON_ERROR_STOP=1", "-U",
                System.getenv().getOrDefault("EVIDENCE_MIGRATION_TEST_USER", "postgres"), "-d",
                System.getenv("EVIDENCE_MIGRATION_TEST_DATABASE")).redirectErrorStream(true).start();
        try (var output = process.getOutputStream()) { output.write((fixture + migration + assertions).getBytes(StandardCharsets.UTF_8)); }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertEquals(0, process.waitFor(), output);
    }
}
