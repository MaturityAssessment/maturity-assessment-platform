ALTER TABLE maturity_models
    ADD COLUMN IF NOT EXISTS changelog_markdown TEXT;
