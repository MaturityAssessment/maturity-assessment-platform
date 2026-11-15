ALTER TABLE practices ADD COLUMN child_state_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(child_state_gating_rules) = 'array');
ALTER TABLE modules ADD COLUMN child_state_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(child_state_gating_rules) = 'array');
ALTER TABLE dimensions ADD COLUMN child_state_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(child_state_gating_rules) = 'array');
