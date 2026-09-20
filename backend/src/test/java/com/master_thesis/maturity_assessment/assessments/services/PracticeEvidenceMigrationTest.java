package com.master_thesis.maturity_assessment.assessments.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Run with EVIDENCE_MIGRATION_TEST_DATABASE=<local database> (psql must be available).
 * All relations are TEMP tables and every successful session ends with ROLLBACK.
 * A failed psql session also rolls back, without touching application tables.
 */
@EnabledIfEnvironmentVariable(named = "EVIDENCE_MIGRATION_TEST_DATABASE", matches = ".+")
class PracticeEvidenceMigrationTest {
    private static final String FIXTURE = """
            BEGIN;
            SET LOCAL search_path = pg_temp;
            CREATE TEMP TABLE dimensions (id bigint PRIMARY KEY, maturity_model_id bigint);
            CREATE TEMP TABLE modules (id bigint PRIMARY KEY, dimension_id bigint);
            CREATE TEMP TABLE practices (id bigint PRIMARY KEY, module_id bigint);
            CREATE TEMP TABLE questions (id bigint PRIMARY KEY, practice_id bigint, type text,
                requires_evidence boolean, required boolean, depends_on_question_id bigint, code text);
            CREATE TEMP TABLE assessments (id bigint PRIMARY KEY, maturity_model_id bigint, status text);
            CREATE TEMP TABLE question_evaluations (id bigint PRIMARY KEY, question_id bigint, response jsonb);
            CREATE TEMP TABLE gating_rules (practice_id bigint, selection text, child_code text);
            CREATE TEMP TABLE evidence (id bigint PRIMARY KEY, question_id bigint NOT NULL,
                assessment_id bigint, file_path text, description text, uploaded_by_user_id bigint,
                uploaded_by_campaign_participant_id bigint, external_url text);
            INSERT INTO dimensions VALUES (1,10);
            INSERT INTO modules VALUES (2,1);
            INSERT INTO practices VALUES (3,2),(4,2),(5,2),(6,2);
            INSERT INTO questions VALUES
                (30,3,'boolean',true,false,null,'Q30'),
                (31,3,'open_answer',false,false,null,'Q31'),
                (40,4,'boolean',false,false,null,'Q40'),
                (50,5,'evidence',false,true,null,'Q50'),
                (60,6,'evidence',false,false,null,'Q60');
            INSERT INTO assessments VALUES (7,10,'COMPLETED');
            INSERT INTO evidence VALUES
                (70,30,7,'7/30/policy.pdf','Policy',1,null,null),
                (71,31,7,'external-url','Link',null,8,'https://example.com'),
                (72,50,7,'7/50/legacy.pdf','Legacy evidence',1,null,null);
            """;

    @Test
    void preservesEveryEvidenceRowAndMigratesRequirements() throws Exception {
        Result result = migrate("", """
                DO $$ BEGIN
                  IF (SELECT count(*) FROM evidence) <> 3
                     OR (SELECT count(*) FROM evidence WHERE practice_id=3) <> 2
                     OR NOT (SELECT requires_evidence FROM practices WHERE id=3)
                     OR (SELECT requires_evidence FROM practices WHERE id=4)
                     OR NOT (SELECT requires_evidence FROM practices WHERE id=5)
                     OR (SELECT requires_evidence FROM practices WHERE id=6)
                     OR EXISTS (SELECT 1 FROM questions WHERE type='evidence')
                     OR (SELECT file_path FROM evidence WHERE id=72) <> '7/50/legacy.pdf'
                  THEN RAISE EXCEPTION 'Unexpected migrated data'; END IF;
                END $$;
                """);
        assertEquals(0, result.exitCode(), result.output());
    }

    @Test
    void preservesMoreThanFiveMergedItems() throws Exception {
        Result result = migrate("""
                INSERT INTO evidence (id,question_id,assessment_id,file_path)
                SELECT n,30,7,'legacy/'||n FROM generate_series(80,86) n;
                """, """
                DO $$ BEGIN
                  IF (SELECT count(*) FROM evidence WHERE practice_id=3) <> 9
                  THEN RAISE EXCEPTION 'Evidence lost'; END IF;
                END $$;
                """);
        assertEquals(0, result.exitCode(), result.output());
    }

    @Test
    void refusesReferencedEvidenceOnlyQuestions() throws Exception {
        assertRejected("INSERT INTO question_evaluations VALUES (1,50,null);", "response/evaluation references");
    }

    @Test
    void refusesOrphansAndModelMismatches() throws Exception {
        assertRejected("UPDATE evidence SET question_id=999 WHERE id=70;", "orphaned evidence");
        assertRejected("UPDATE assessments SET maturity_model_id=99;", "assessment/model mismatch");
    }

    @Test
    void refusesDependenciesAndGatingReferences() throws Exception {
        assertRejected("UPDATE questions SET depends_on_question_id=50 WHERE id=30;", "dependent questions");
        assertRejected("INSERT INTO gating_rules VALUES (5,'SPECIFIC_CHILD','Q50');", "gating rules reference");
    }

    @Test
    void rejectsRetiredQuestionTypeAfterMigration() throws Exception {
        Result result = migrate("", "INSERT INTO questions (id,type) VALUES (999,'evidence');");
        assertNotEquals(0, result.exitCode());
        assertTrue(result.output().contains("ck_questions_no_evidence_type"), result.output());
    }

    private void assertRejected(String setup, String diagnostic) throws Exception {
        Result result = migrate(setup, "");
        assertNotEquals(0, result.exitCode());
        assertTrue(result.output().contains(diagnostic), result.output());
    }

    private Result migrate(String setup, String assertions) throws Exception {
        String migration;
        try (var stream = getClass().getResourceAsStream("/db/migration/V38__move_evidence_to_practices.sql")) {
            assertNotNull(stream);
            migration = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        Process process = new ProcessBuilder("psql", "-X", "-v", "ON_ERROR_STOP=1",
                "-U", System.getenv().getOrDefault("EVIDENCE_MIGRATION_TEST_USER", "postgres"),
                "-d", System.getenv("EVIDENCE_MIGRATION_TEST_DATABASE"))
                .redirectErrorStream(true).start();
        try (var input = process.getOutputStream()) {
            input.write((FIXTURE + setup + "\n" + migration + "\n" + assertions + "\nROLLBACK;\n")
                    .getBytes(StandardCharsets.UTF_8));
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return new Result(process.waitFor(), output);
    }

    private record Result(int exitCode, String output) {}
}
