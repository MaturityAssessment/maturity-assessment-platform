-- NOT VALID preserves legacy rows while enforcing these limits for new writes.
ALTER TABLE maturity_models
    ADD CONSTRAINT ck_maturity_models_name_length CHECK (char_length(name) <= 150) NOT VALID,
    ADD CONSTRAINT ck_maturity_models_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;
ALTER TABLE maturity_levels
    ADD CONSTRAINT ck_maturity_levels_name_length CHECK (char_length(name) <= 150) NOT VALID,
    ADD CONSTRAINT ck_maturity_levels_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;
ALTER TABLE dimensions
    ADD CONSTRAINT ck_dimensions_code_length CHECK (char_length(dimension_id) <= 64) NOT VALID,
    ADD CONSTRAINT ck_dimensions_name_length CHECK (char_length(name) <= 150) NOT VALID,
    ADD CONSTRAINT ck_dimensions_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;
ALTER TABLE modules
    ADD CONSTRAINT ck_modules_code_length CHECK (char_length(code) <= 64) NOT VALID,
    ADD CONSTRAINT ck_modules_name_length CHECK (char_length(name) <= 150) NOT VALID,
    ADD CONSTRAINT ck_modules_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID,
    ADD CONSTRAINT ck_modules_public_label_code_length CHECK (public_label_code IS NULL OR char_length(public_label_code) <= 64) NOT VALID,
    ADD CONSTRAINT ck_modules_public_label_name_length CHECK (public_label_name IS NULL OR char_length(public_label_name) <= 150) NOT VALID;
ALTER TABLE practices
    ADD CONSTRAINT ck_practices_code_length CHECK (char_length(code) <= 64) NOT VALID,
    ADD CONSTRAINT ck_practices_name_length CHECK (char_length(name) <= 150) NOT VALID,
    ADD CONSTRAINT ck_practices_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;
ALTER TABLE questions
    ADD CONSTRAINT ck_questions_code_length CHECK (char_length(code) <= 64) NOT VALID,
    ADD CONSTRAINT ck_questions_text_length CHECK (char_length(text) <= 500) NOT VALID,
    ADD CONSTRAINT ck_questions_help_length CHECK (help IS NULL OR char_length(help) <= 500) NOT VALID;
ALTER TABLE assessments
    ADD CONSTRAINT ck_assessments_evaluator_insight_length CHECK (evaluator_insight IS NULL OR char_length(evaluator_insight) <= 2000) NOT VALID;
