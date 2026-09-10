CREATE TABLE gating_rules (
    id BIGSERIAL PRIMARY KEY,
    practice_id BIGINT REFERENCES practices(id) ON DELETE CASCADE,
    module_id BIGINT REFERENCES modules(id) ON DELETE CASCADE,
    dimension_id BIGINT REFERENCES dimensions(id) ON DELETE CASCADE,
    rule_order INTEGER NOT NULL,
    selection VARCHAR(32) NOT NULL,
    child_code VARCHAR(64),
    comparison_operator VARCHAR(32) NOT NULL,
    threshold NUMERIC(3,2) NOT NULL,
    score_operation VARCHAR(32) NOT NULL,
    operation_value NUMERIC(3,2) NOT NULL,
    CONSTRAINT gating_rule_single_owner_check CHECK (
        (CASE WHEN practice_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN module_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN dimension_id IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT gating_rule_order_check CHECK (rule_order >= 0),
    CONSTRAINT gating_rule_selection_check CHECK (
        selection IN ('SPECIFIC_CHILD', 'ANY_CHILD', 'ALL_CHILDREN')
    ),
    CONSTRAINT gating_rule_child_check CHECK (
        (selection = 'SPECIFIC_CHILD' AND child_code IS NOT NULL AND btrim(child_code) <> '') OR
        (selection <> 'SPECIFIC_CHILD' AND child_code IS NULL)
    ),
    CONSTRAINT gating_rule_operator_check CHECK (
        comparison_operator IN ('BELOW', 'BELOW_OR_EQUAL', 'EQUAL', 'ABOVE_OR_EQUAL', 'ABOVE')
    ),
    CONSTRAINT gating_rule_operation_check CHECK (
        score_operation IN ('SET', 'ADD', 'SUBTRACT')
    ),
    CONSTRAINT gating_rule_threshold_check CHECK (threshold >= 0.00 AND threshold <= 1.00),
    CONSTRAINT gating_rule_value_check CHECK (operation_value >= 0.00 AND operation_value <= 1.00),
    CONSTRAINT uk_gating_rule_practice_order UNIQUE (practice_id, rule_order),
    CONSTRAINT uk_gating_rule_module_order UNIQUE (module_id, rule_order),
    CONSTRAINT uk_gating_rule_dimension_order UNIQUE (dimension_id, rule_order)
);

CREATE INDEX idx_gating_rules_practice ON gating_rules(practice_id);
CREATE INDEX idx_gating_rules_module ON gating_rules(module_id);
CREATE INDEX idx_gating_rules_dimension ON gating_rules(dimension_id);
