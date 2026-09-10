ALTER TABLE maturity_models
    ADD COLUMN IF NOT EXISTS aggregation_rule VARCHAR(32);

UPDATE maturity_models
SET aggregation_rule = COALESCE(aggregation_rule, dimension_aggregation_rule, 'WEIGHTED_AVERAGE');

ALTER TABLE maturity_models
    ALTER COLUMN aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN aggregation_rule SET NOT NULL;

ALTER TABLE maturity_models
    ADD CONSTRAINT maturity_models_aggregation_rule_check
        CHECK (aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN'));

ALTER TABLE maturity_models
    DROP CONSTRAINT IF EXISTS maturity_models_question_aggregation_rule_check,
    DROP CONSTRAINT IF EXISTS maturity_models_practice_aggregation_rule_check,
    DROP CONSTRAINT IF EXISTS maturity_models_module_aggregation_rule_check,
    DROP CONSTRAINT IF EXISTS maturity_models_dimension_aggregation_rule_check,
    DROP COLUMN IF EXISTS question_aggregation_rule,
    DROP COLUMN IF EXISTS practice_aggregation_rule,
    DROP COLUMN IF EXISTS module_aggregation_rule,
    DROP COLUMN IF EXISTS dimension_aggregation_rule;

ALTER TABLE practices
    ADD COLUMN IF NOT EXISTS aggregation_rule VARCHAR(32);

UPDATE practices SET aggregation_rule = 'WEIGHTED_AVERAGE' WHERE aggregation_rule IS NULL;

ALTER TABLE practices
    ALTER COLUMN aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN aggregation_rule SET NOT NULL,
    ADD CONSTRAINT practices_aggregation_rule_check
        CHECK (aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN'));

ALTER TABLE modules
    ADD COLUMN IF NOT EXISTS aggregation_rule VARCHAR(32);

UPDATE modules SET aggregation_rule = 'WEIGHTED_AVERAGE' WHERE aggregation_rule IS NULL;

ALTER TABLE modules
    ALTER COLUMN aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN aggregation_rule SET NOT NULL,
    ADD CONSTRAINT modules_aggregation_rule_check
        CHECK (aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN'));

ALTER TABLE dimensions
    ADD COLUMN IF NOT EXISTS aggregation_rule VARCHAR(32);

UPDATE dimensions SET aggregation_rule = 'WEIGHTED_AVERAGE' WHERE aggregation_rule IS NULL;

ALTER TABLE dimensions
    ALTER COLUMN aggregation_rule SET DEFAULT 'WEIGHTED_AVERAGE',
    ALTER COLUMN aggregation_rule SET NOT NULL,
    ADD CONSTRAINT dimensions_aggregation_rule_check
        CHECK (aggregation_rule IN ('AVERAGE', 'WEIGHTED_AVERAGE', 'MINIMUM', 'MAXIMUM', 'SUM', 'MEDIAN'));
