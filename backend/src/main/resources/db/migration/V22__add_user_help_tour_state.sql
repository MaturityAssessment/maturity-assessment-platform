ALTER TABLE users
    ADD COLUMN help_balloons_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN completed_help_tours JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT ck_users_completed_help_tours_object
        CHECK (jsonb_typeof(completed_help_tours) = 'object');
