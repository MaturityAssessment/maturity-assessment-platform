ALTER TABLE maturity_models ADD COLUMN IF NOT EXISTS target_profiles JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS profiling JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS target_profile_comparison JSONB;
