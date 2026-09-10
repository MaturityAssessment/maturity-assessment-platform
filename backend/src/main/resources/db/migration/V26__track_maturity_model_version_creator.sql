ALTER TABLE maturity_models
    ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;

ALTER TABLE maturity_models
    DROP CONSTRAINT IF EXISTS fk_maturity_models_created_by_user;

ALTER TABLE maturity_models
    ADD CONSTRAINT fk_maturity_models_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maturity_models_created_by_user_id
    ON maturity_models(created_by_user_id);
