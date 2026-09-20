-- Flyway executes this PostgreSQL migration transactionally. Back up the database
-- and evidence storage before deploying the coordinated API/frontend release.
-- Stored file paths are deliberately preserved; no filesystem migration is needed.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM evidence e
        LEFT JOIN questions q ON q.id = e.question_id
        LEFT JOIN practices p ON p.id = q.practice_id
        LEFT JOIN modules m ON m.id = p.module_id
        LEFT JOIN dimensions d ON d.id = m.dimension_id
        LEFT JOIN assessments a ON a.id = e.assessment_id
        WHERE p.id IS NULL OR a.id IS NULL
           OR d.maturity_model_id IS DISTINCT FROM a.maturity_model_id
    ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: orphaned evidence or assessment/model mismatch';
    END IF;
    IF EXISTS (
        SELECT 1 FROM question_evaluations qe JOIN questions q ON q.id = qe.question_id
        WHERE lower(q.type) IN ('evidence', 'file_evidence', 'link_evidence')
    ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: evidence-only questions have response/evaluation references';
    END IF;
    IF EXISTS (
        SELECT 1 FROM gating_rules g JOIN questions q
          ON q.practice_id = g.practice_id AND lower(q.code) = lower(g.child_code)
        WHERE g.selection = 'SPECIFIC_CHILD'
          AND lower(q.type) IN ('evidence', 'file_evidence', 'link_evidence')
    ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: gating rules reference evidence-only questions';
    END IF;
    IF EXISTS (
        SELECT 1 FROM questions child JOIN questions parent ON parent.id = child.depends_on_question_id
        WHERE lower(parent.type) IN ('evidence', 'file_evidence', 'link_evidence')
    ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: evidence-only questions have dependent questions';
    END IF;
END $$;

CREATE TEMP TABLE practice_evidence_expected ON COMMIT DROP AS
SELECT p.id, EXISTS (
    SELECT 1 FROM questions q WHERE q.practice_id = p.id
      AND (q.requires_evidence OR
           (lower(q.type) IN ('evidence', 'file_evidence', 'link_evidence') AND q.required))
) AS requires_evidence FROM practices p;

CREATE TEMP TABLE practice_evidence_snapshot ON COMMIT DROP AS
SELECT e.id, q.practice_id, to_jsonb(e) - 'question_id' AS metadata
FROM evidence e JOIN questions q ON q.id = e.question_id;

ALTER TABLE practices ADD COLUMN requires_evidence BOOLEAN NOT NULL DEFAULT false;
UPDATE practices p SET requires_evidence = expected.requires_evidence
FROM practice_evidence_expected expected WHERE expected.id = p.id;

ALTER TABLE evidence ADD COLUMN practice_id BIGINT;
UPDATE evidence e SET practice_id = snapshot.practice_id
FROM practice_evidence_snapshot snapshot WHERE snapshot.id = e.id;
ALTER TABLE evidence
    ALTER COLUMN practice_id SET NOT NULL,
    ADD CONSTRAINT fk_evidence_practice FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE RESTRICT;
CREATE INDEX ix_evidence_assessment_practice ON evidence (assessment_id, practice_id);
ALTER TABLE evidence DROP COLUMN question_id;

DELETE FROM questions WHERE lower(type) IN ('evidence', 'file_evidence', 'link_evidence');
ALTER TABLE questions DROP COLUMN requires_evidence;
ALTER TABLE questions ADD CONSTRAINT ck_questions_no_evidence_type
    CHECK (lower(type) NOT IN ('evidence', 'file_evidence', 'link_evidence'));

DO $$
BEGIN
    IF (SELECT count(*) FROM evidence) <> (SELECT count(*) FROM practice_evidence_snapshot)
       OR EXISTS (
           SELECT 1 FROM practice_evidence_snapshot s LEFT JOIN evidence e ON e.id = s.id
           WHERE e.id IS NULL OR e.practice_id IS DISTINCT FROM s.practice_id
              OR (to_jsonb(e) - 'practice_id') IS DISTINCT FROM s.metadata
       ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: evidence count, ownership or metadata changed unexpectedly';
    END IF;
    IF EXISTS (
        SELECT 1 FROM practices p JOIN practice_evidence_expected x ON x.id = p.id
        WHERE p.requires_evidence IS DISTINCT FROM x.requires_evidence
    ) THEN
        RAISE EXCEPTION 'Practice evidence migration aborted: requirement flags differ from expected values';
    END IF;
END $$;
