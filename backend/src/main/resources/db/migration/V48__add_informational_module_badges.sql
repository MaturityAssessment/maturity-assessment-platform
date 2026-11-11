ALTER TABLE modules ADD COLUMN IF NOT EXISTS mandatory_badge BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS module_reinforcement_badges (
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    badge_order INTEGER NOT NULL,
    target_module_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (module_id, badge_order)
);

CREATE TABLE IF NOT EXISTS module_substitution_badges (
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    badge_order INTEGER NOT NULL,
    target_module_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (module_id, badge_order)
);

