ALTER TABLE maturity_models
    ADD COLUMN IF NOT EXISTS question_aggregation_rule VARCHAR(32),
    ADD COLUMN IF NOT EXISTS practice_aggregation_rule VARCHAR(32),
    ADD COLUMN IF NOT EXISTS module_aggregation_rule VARCHAR(32),
    ADD COLUMN IF NOT EXISTS dimension_aggregation_rule VARCHAR(32);

UPDATE maturity_models
SET question_aggregation_rule = COALESCE(question_aggregation_rule, 'WEIGHTED_AVERAGE'),
    practice_aggregation_rule = COALESCE(practice_aggregation_rule, 'WEIGHTED_AVERAGE'),
    module_aggregation_rule = COALESCE(module_aggregation_rule, 'WEIGHTED_AVERAGE'),
    dimension_aggregation_rule = COALESCE(dimension_aggregation_rule, 'WEIGHTED_AVERAGE');

ALTER TABLE maturity_models
    ALTER COLUMN question_aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN question_aggregation_rule SET NOT NULL,
    ALTER COLUMN practice_aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN practice_aggregation_rule SET NOT NULL,
    ALTER COLUMN module_aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN module_aggregation_rule SET NOT NULL,
    ALTER COLUMN dimension_aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN dimension_aggregation_rule SET NOT NULL;

ALTER TABLE maturity_models
    ADD CONSTRAINT maturity_models_question_aggregation_rule_check
        CHECK (question_aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN')),
    ADD CONSTRAINT maturity_models_practice_aggregation_rule_check
        CHECK (practice_aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN')),
    ADD CONSTRAINT maturity_models_module_aggregation_rule_check
        CHECK (module_aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN')),
    ADD CONSTRAINT maturity_models_dimension_aggregation_rule_check
        CHECK (dimension_aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN'));

ALTER TABLE dimensions
    ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;

UPDATE dimensions SET weight = 1.0 WHERE weight IS NULL;

ALTER TABLE dimensions
    ALTER COLUMN weight SET DEFAULT 1.0,
    ALTER COLUMN weight SET NOT NULL;
