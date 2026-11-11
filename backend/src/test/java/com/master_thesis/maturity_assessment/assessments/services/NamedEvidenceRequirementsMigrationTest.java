package com.master_thesis.maturity_assessment.assessments.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

/** Isolated schema, rolled back: never migrates application tables. */
@EnabledIfEnvironmentVariable(named = "EVIDENCE_MIGRATION_TEST_DATABASE", matches = ".+")
class NamedEvidenceRequirementsMigrationTest {
    @Test
    void preservesLegacyEvidenceAndEnforcesPracticeScopedRequirements() throws Exception {
        String migration;
        try (var input = getClass().getResourceAsStream("/db/migration/V49__add_named_evidence_requirements.sql")) {
            assertNotNull(input);
            migration = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        String fixture = """
                BEGIN;
                CREATE SCHEMA named_evidence_migration_test;
                SET LOCAL search_path = named_evidence_migration_test;
                CREATE TABLE practices (id BIGINT PRIMARY KEY, requires_evidence BOOLEAN);
                CREATE TABLE evidence (id BIGINT PRIMARY KEY, practice_id BIGINT NOT NULL REFERENCES practices(id), file_path TEXT);
                INSERT INTO practices VALUES (10, TRUE), (20, FALSE);
                INSERT INTO evidence VALUES (1, 10, 'original/report.pdf'), (2, 20, 'original/extra.pdf');
                """;
        String assertions = """
                DO $$ BEGIN
                  IF (SELECT count(*) FROM practice_evidence_requirements) <> 1
                    OR (SELECT requirement_code FROM evidence WHERE id=1) <> 'supporting-evidence'
                    OR (SELECT requirement_code FROM evidence WHERE id=2) IS NOT NULL
                    OR EXISTS (SELECT 1 FROM evidence WHERE evidence_date IS NOT NULL)
                    OR (SELECT file_path FROM evidence WHERE id=1) <> 'original/report.pdf'
                  THEN RAISE EXCEPTION 'Legacy evidence was not preserved'; END IF;
                  BEGIN
                    UPDATE evidence SET requirement_code='supporting-evidence' WHERE id=2;
                    RAISE EXCEPTION 'Cross-practice requirement accepted';
                  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
                END $$;
                INSERT INTO practice_evidence_requirements VALUES (20, 0, 'report', 'Monthly report', '', TRUE, 'FILE_OR_URL');
                UPDATE evidence SET requirement_code='report', evidence_date='2020-10-31' WHERE id=2;
                DO $$ BEGIN
                  BEGIN
                    DELETE FROM practice_evidence_requirements WHERE practice_id=20;
                    RAISE EXCEPTION 'Referenced requirement deleted';
                  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
                END $$;
                DELETE FROM evidence WHERE id=2;
                DELETE FROM practices WHERE id=20;
                ROLLBACK;
                """;
        Process process = new ProcessBuilder("psql", "-X", "-v", "ON_ERROR_STOP=1",
                "-U", System.getenv().getOrDefault("EVIDENCE_MIGRATION_TEST_USER", "postgres"),
                "-d", System.getenv("EVIDENCE_MIGRATION_TEST_DATABASE")).redirectErrorStream(true).start();
        try (var output = process.getOutputStream()) {
            output.write((fixture + migration + assertions).getBytes(StandardCharsets.UTF_8));
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertEquals(0, process.waitFor(), output);
    }
}
