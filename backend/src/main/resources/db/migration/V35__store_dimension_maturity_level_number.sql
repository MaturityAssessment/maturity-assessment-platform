ALTER TABLE dimension_results
    ADD COLUMN maturity_level_number INTEGER;

UPDATE dimension_results dr
SET maturity_level_number = matched.level_number
FROM (
    SELECT dr2.id AS result_id, MIN(ml.number) AS level_number
    FROM dimension_results dr2
    JOIN assessments a ON a.id = dr2.assessment_id
    JOIN maturity_levels ml
      ON ml.maturity_model_id = a.maturity_model_id
     AND ml.name = dr2.maturity_level
    GROUP BY dr2.id
) matched
WHERE dr.id = matched.result_id;
