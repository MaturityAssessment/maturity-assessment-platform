CREATE INDEX IF NOT EXISTS ix_evidence_assessment_question
    ON evidence (assessment_id, question_id);
