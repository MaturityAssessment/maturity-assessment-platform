-- Pre-launch reset; external evidence blobs require separate storage housekeeping.
DELETE FROM evidence WHERE assessment_id IN (SELECT id FROM assessments WHERE campaign_id IS NOT NULL);
DELETE FROM question_evaluations WHERE assessment_id IN (SELECT id FROM assessments WHERE campaign_id IS NOT NULL);
DELETE FROM dimension_results WHERE assessment_id IN (SELECT id FROM assessments WHERE campaign_id IS NOT NULL);
DELETE FROM assessments WHERE campaign_id IS NOT NULL;
DELETE FROM campaign_participants;
DELETE FROM campaigns;
-- Hibernate-managed development databases may already have these columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_credentials_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN profile_completion_required SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN initial_credentials_pending SET DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci ON users (lower(email));
ALTER TABLE campaign_participants DROP COLUMN invitation_token_hash;
ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE campaign_participants ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE campaign_participants ADD CONSTRAINT uk_campaign_user UNIQUE (campaign_id, user_id);
ALTER TABLE campaign_participants ADD CONSTRAINT uk_participant_user UNIQUE (id, user_id);
CREATE INDEX idx_campaign_participants_user ON campaign_participants(user_id);
ALTER TABLE evidence DROP CONSTRAINT ck_evidence_uploader;
ALTER TABLE evidence DROP COLUMN uploaded_by_campaign_participant_id;
ALTER TABLE evidence ALTER COLUMN uploaded_by_user_id SET NOT NULL;
ALTER TABLE assessments DROP CONSTRAINT ck_assessments_respondent_owner;
ALTER TABLE assessments ADD CONSTRAINT ck_assessments_respondent_owner CHECK (
    user_id IS NOT NULL AND (
        (campaign_id IS NULL AND campaign_participant_id IS NULL) OR
        (campaign_id IS NOT NULL AND campaign_participant_id IS NOT NULL AND maturity_model_id IS NOT NULL)
    )
);
ALTER TABLE assessments ADD CONSTRAINT fk_assessment_participant_user
    FOREIGN KEY (campaign_participant_id, user_id) REFERENCES campaign_participants(id, user_id);
DROP INDEX ux_assessments_user_model_draft;
CREATE UNIQUE INDEX ux_assessments_user_model_draft ON assessments(user_id, maturity_model_id)
    WHERE status = 'DRAFT' AND campaign_id IS NULL AND user_id IS NOT NULL AND maturity_model_id IS NOT NULL;
