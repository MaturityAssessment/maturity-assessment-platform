CREATE TABLE assessment_logs (
    id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL,
    actor_campaign_participant_id BIGINT,
    actor_name VARCHAR(255),
    actor_email VARCHAR(255),
    actor_role VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    target_id BIGINT NOT NULL,
    target_label TEXT NOT NULL,
    before_value JSONB,
    after_value JSONB,
    occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_assessment_logs_history ON assessment_logs (assessment_id, occurred_at DESC, id DESC);
