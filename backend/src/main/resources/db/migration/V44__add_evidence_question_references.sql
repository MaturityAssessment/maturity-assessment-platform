-- References describe the questions supported by an item; practice_id remains
-- the evidence owner. Historical evidence deliberately has no inferred links.
CREATE TABLE evidence_question_references (
    evidence_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    CONSTRAINT pk_evidence_question_references PRIMARY KEY (evidence_id, question_id),
    CONSTRAINT fk_evidence_question_reference_evidence
        FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidence_question_reference_question
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT
);

CREATE INDEX ix_evidence_question_references_question
    ON evidence_question_references (question_id);
