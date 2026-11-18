ALTER TABLE practices ADD COLUMN score_limits jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE modules ADD COLUMN score_limits jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE dimensions ADD COLUMN score_limits jsonb NOT NULL DEFAULT '[]'::jsonb;
