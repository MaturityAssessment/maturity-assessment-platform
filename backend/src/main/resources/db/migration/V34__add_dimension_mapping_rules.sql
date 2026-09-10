CREATE TABLE dimension_mapping_rules (
    id BIGSERIAL PRIMARY KEY,
    dimension_id BIGINT NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    minimum_score DOUBLE PRECISION NOT NULL,
    CONSTRAINT uk_dimension_mapping_rule_level UNIQUE (dimension_id, level_number),
    CONSTRAINT dimension_mapping_rule_level_check CHECK (level_number >= 1),
    CONSTRAINT dimension_mapping_rule_score_check CHECK (minimum_score >= 0.0 AND minimum_score <= 1.0)
);

-- Preserve the previous equal-width mapping as the default for existing models.
INSERT INTO dimension_mapping_rules (dimension_id, level_number, minimum_score)
SELECT d.id,
       ml.number,
       CASE
           WHEN ml.number = 1 THEN 0.0
           ELSE (ml.number - 1)::DOUBLE PRECISION / level_count.total
       END
FROM dimensions d
JOIN maturity_models mm ON mm.id = d.maturity_model_id
JOIN maturity_levels ml ON ml.maturity_model_id = mm.id
JOIN (
    SELECT maturity_model_id, COUNT(*)::DOUBLE PRECISION AS total
    FROM maturity_levels
    GROUP BY maturity_model_id
) level_count ON level_count.maturity_model_id = mm.id;
