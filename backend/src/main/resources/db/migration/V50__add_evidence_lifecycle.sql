ALTER TABLE practice_evidence_requirements
    ADD COLUMN frequency VARCHAR(20) NOT NULL DEFAULT 'adhoc'
        CHECK (frequency IN ('adhoc', 'monthly', 'quarterly', 'yearly')),
    ADD COLUMN max_age_days INTEGER CHECK (max_age_days >= 0);

ALTER TABLE evidence RENAME COLUMN evidence_date TO collected_at;

ALTER TABLE assessments ADD COLUMN reference_date DATE;
ALTER TABLE assessments ADD COLUMN reference_date_inferred BOOLEAN NOT NULL DEFAULT FALSE;
-- Preserve results. Historical reference dates were not recorded: make the
-- migration assumption explicit, rather than silently presenting it as known.
UPDATE assessments SET reference_date = created_at::date, reference_date_inferred = TRUE;
ALTER TABLE assessments ALTER COLUMN reference_date SET NOT NULL;
