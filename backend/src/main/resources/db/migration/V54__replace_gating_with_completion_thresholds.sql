-- Legacy score-adjustment rules have no equivalent completion threshold. Retain their
-- historical rows in gating_rules, but retire their API and scoring behavior.
ALTER TABLE practices
    ADD COLUMN minimum_coverage DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_coverage BETWEEN 0 AND 100),
    ADD COLUMN minimum_included_count DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_included_count BETWEEN 0 AND 100);
ALTER TABLE modules
    ADD COLUMN minimum_coverage DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_coverage BETWEEN 0 AND 100),
    ADD COLUMN minimum_included_count DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_included_count BETWEEN 0 AND 100);
ALTER TABLE dimensions
    ADD COLUMN minimum_coverage DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_coverage BETWEEN 0 AND 100),
    ADD COLUMN minimum_included_count DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (minimum_included_count BETWEEN 0 AND 100);

-- Old assessments remain unmodified: these metrics cannot be reconstructed reliably
-- without evaluating their visible questions and effective scores again.
ALTER TABLE assessments
    ADD COLUMN coverage DOUBLE PRECISION,
    ADD COLUMN included_count DOUBLE PRECISION,
    ADD COLUMN score_state VARCHAR(20),
    ADD COLUMN element_results JSONB,
    ALTER COLUMN overall_average DROP NOT NULL,
    ALTER COLUMN overall_maturity_level DROP NOT NULL;
ALTER TABLE dimension_results
    ADD COLUMN coverage DOUBLE PRECISION,
    ADD COLUMN included_count DOUBLE PRECISION,
    ADD COLUMN score_state VARCHAR(20),
    ALTER COLUMN average_score DROP NOT NULL,
    ALTER COLUMN maturity_level DROP NOT NULL;
