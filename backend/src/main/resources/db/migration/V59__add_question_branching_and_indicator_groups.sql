ALTER TABLE questions ADD COLUMN branching_rule jsonb;
ALTER TABLE questions ADD COLUMN hidden_score double precision;
ALTER TABLE questions ADD CONSTRAINT question_hidden_score_range CHECK (hidden_score IS NULL OR (hidden_score >= 0 AND hidden_score <= 1));
ALTER TABLE practice_evidence_requirements ADD COLUMN question_codes jsonb;
ALTER TABLE practice_evidence_requirements ADD CONSTRAINT evidence_question_group_array CHECK (question_codes IS NULL OR (jsonb_typeof(question_codes) = 'array' AND jsonb_array_length(question_codes) > 0));
