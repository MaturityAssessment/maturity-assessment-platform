CREATE TABLE question_evaluations (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL,
    response_key VARCHAR(500) NOT NULL,
    question_id BIGINT,
    validation_status VARCHAR(20) NOT NULL,
    manual_score INTEGER,
    reviewer_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_question_evaluations_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessments(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_question_evaluation_assessment_response_key
        UNIQUE (assessment_id, response_key),
    CONSTRAINT ck_question_evaluation_status
        CHECK (validation_status IN ('ACCEPTED', 'ADJUSTED', 'FLAGGED'))
);

CREATE INDEX idx_question_evaluations_assessment_id
    ON question_evaluations(assessment_id);

CREATE INDEX idx_question_evaluations_question_id
    ON question_evaluations(question_id);
