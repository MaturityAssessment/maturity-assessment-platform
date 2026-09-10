CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    maturity_model_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaigns_maturity_model
        FOREIGN KEY (maturity_model_id)
        REFERENCES maturity_models(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_campaigns_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_campaigns_name_nonblank
        CHECK (btrim(name) <> ''),
    CONSTRAINT ck_campaigns_end_after_creation
        CHECK (ends_at > created_at),
    CONSTRAINT uk_campaigns_id_maturity_model
        UNIQUE (id, maturity_model_id)
);

CREATE INDEX idx_campaigns_created_by_user_id
    ON campaigns(created_by_user_id);

CREATE INDEX idx_campaigns_maturity_model_id
    ON campaigns(maturity_model_id);

CREATE INDEX idx_campaigns_ends_at
    ON campaigns(ends_at);

CREATE TABLE campaign_participants (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    invitation_token_hash VARCHAR(64) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_campaign_participants_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_campaign_participants_token_hash
        UNIQUE (invitation_token_hash),
    CONSTRAINT uk_campaign_participants_id_campaign
        UNIQUE (id, campaign_id),
    CONSTRAINT ck_campaign_participants_email_nonblank
        CHECK (btrim(email) <> ''),
    CONSTRAINT ck_campaign_participants_email_trimmed
        CHECK (email = btrim(email)),
    CONSTRAINT ck_campaign_participants_token_hash
        CHECK (invitation_token_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX ux_campaign_participants_campaign_email_ci
    ON campaign_participants(campaign_id, lower(email));

CREATE INDEX idx_campaign_participants_campaign_id
    ON campaign_participants(campaign_id);

ALTER TABLE assessments
    ADD COLUMN campaign_id BIGINT,
    ADD COLUMN campaign_participant_id BIGINT,
    ADD CONSTRAINT fk_assessments_maturity_model
        FOREIGN KEY (maturity_model_id)
        REFERENCES maturity_models(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assessments_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assessments_campaign_participant
        FOREIGN KEY (campaign_participant_id)
        REFERENCES campaign_participants(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assessments_campaign_model
        FOREIGN KEY (campaign_id, maturity_model_id)
        REFERENCES campaigns(id, maturity_model_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assessments_participant_campaign
        FOREIGN KEY (campaign_participant_id, campaign_id)
        REFERENCES campaign_participants(id, campaign_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT uk_assessments_campaign_participant
        UNIQUE (campaign_participant_id),
    ADD CONSTRAINT uk_assessments_id_campaign_participant
        UNIQUE (id, campaign_participant_id),
    ADD CONSTRAINT ck_assessments_respondent_owner
        CHECK (
            (
                user_id IS NOT NULL
                AND campaign_id IS NULL
                AND campaign_participant_id IS NULL
            )
            OR
            (
                user_id IS NULL
                AND campaign_id IS NOT NULL
                AND campaign_participant_id IS NOT NULL
                AND maturity_model_id IS NOT NULL
            )
        );

CREATE INDEX idx_assessments_campaign_id
    ON assessments(campaign_id);

ALTER TABLE evidence
    ADD COLUMN uploaded_by_campaign_participant_id BIGINT,
    ALTER COLUMN uploaded_by_user_id DROP NOT NULL,
    ADD CONSTRAINT fk_evidence_campaign_participant
        FOREIGN KEY (uploaded_by_campaign_participant_id)
        REFERENCES campaign_participants(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_evidence_assessment_campaign_participant
        FOREIGN KEY (assessment_id, uploaded_by_campaign_participant_id)
        REFERENCES assessments(id, campaign_participant_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT ck_evidence_uploader
        CHECK (
            num_nonnulls(
                uploaded_by_user_id,
                uploaded_by_campaign_participant_id
            ) = 1
        );

CREATE INDEX idx_evidence_campaign_participant_id
    ON evidence(uploaded_by_campaign_participant_id);
