ALTER TABLE maturity_models
    DROP COLUMN IF EXISTS minimum_coverage_percentage,
    DROP COLUMN IF EXISTS coverage_calculation;

ALTER TABLE assessments
    DROP COLUMN IF EXISTS answer_states,
    DROP COLUMN IF EXISTS missing_evidence_explanations,
    DROP COLUMN IF EXISTS coverage_percentage,
    DROP COLUMN IF EXISTS coverage_threshold,
    DROP COLUMN IF EXISTS coverage_calculation,
    DROP COLUMN IF EXISTS below_coverage_threshold,
    DROP COLUMN IF EXISTS required_answered_count,
    DROP COLUMN IF EXISTS required_skipped_count,
    DROP COLUMN IF EXISTS required_blank_count,
    DROP COLUMN IF EXISTS optional_answered_count,
    DROP COLUMN IF EXISTS optional_skipped_count,
    DROP COLUMN IF EXISTS optional_blank_count,
    DROP COLUMN IF EXISTS required_evidence_supplied_count,
    DROP COLUMN IF EXISTS required_evidence_explained_count;
