ALTER TABLE maturity_models
    ADD COLUMN IF NOT EXISTS minimum_coverage_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS coverage_calculation VARCHAR(40) NOT NULL DEFAULT 'SUBSTANTIVE_PERCENTAGE';

ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS answer_states TEXT,
    ADD COLUMN IF NOT EXISTS missing_evidence_explanations TEXT,
    ADD COLUMN IF NOT EXISTS coverage_percentage DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS coverage_threshold DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS coverage_calculation VARCHAR(40),
    ADD COLUMN IF NOT EXISTS below_coverage_threshold BOOLEAN,
    ADD COLUMN IF NOT EXISTS required_answered_count INTEGER,
    ADD COLUMN IF NOT EXISTS required_skipped_count INTEGER,
    ADD COLUMN IF NOT EXISTS required_blank_count INTEGER,
    ADD COLUMN IF NOT EXISTS optional_answered_count INTEGER,
    ADD COLUMN IF NOT EXISTS optional_skipped_count INTEGER,
    ADD COLUMN IF NOT EXISTS optional_blank_count INTEGER,
    ADD COLUMN IF NOT EXISTS required_evidence_supplied_count INTEGER,
    ADD COLUMN IF NOT EXISTS required_evidence_explained_count INTEGER;
