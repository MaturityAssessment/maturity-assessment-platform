ALTER TABLE practices ADD COLUMN conditional_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(conditional_gating_rules) = 'array');
ALTER TABLE modules ADD COLUMN conditional_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(conditional_gating_rules) = 'array');
ALTER TABLE dimensions ADD COLUMN conditional_gating_rules JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(conditional_gating_rules) = 'array');
