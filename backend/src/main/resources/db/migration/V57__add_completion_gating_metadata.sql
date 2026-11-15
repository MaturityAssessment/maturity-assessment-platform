ALTER TABLE practices ADD COLUMN completion_gating_metadata JSONB;
ALTER TABLE modules ADD COLUMN completion_gating_metadata JSONB;
ALTER TABLE dimensions ADD COLUMN completion_gating_metadata JSONB;
