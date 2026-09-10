-- Repair legacy violations deterministically by retaining the newest version,
-- using the greatest row ID as a stable tie-breaker.
WITH ranked_active_versions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(base_model_id, id)
            ORDER BY version DESC NULLS LAST, id DESC
        ) AS active_rank
    FROM maturity_models
    WHERE is_active IS TRUE
)
UPDATE maturity_models model
SET is_active = FALSE
FROM ranked_active_versions ranked
WHERE model.id = ranked.id
  AND ranked.active_rank > 1;

CREATE UNIQUE INDEX ux_maturity_models_one_active_version_per_lineage
    ON maturity_models ((COALESCE(base_model_id, id)))
    WHERE is_active IS TRUE;
