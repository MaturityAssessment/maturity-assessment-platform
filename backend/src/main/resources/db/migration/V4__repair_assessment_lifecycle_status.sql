-- Submitted assessments reuse their saved draft row. A previous transition bug
-- left those rows as DRAFT even though calculated results had been persisted.
UPDATE public.assessments a
SET
    status = CASE
        WHEN COALESCE(mm.auto_evaluated, true) THEN 'COMPLETED'
        ELSE 'PENDING_REVIEW'
    END,
    is_completed = COALESCE(mm.auto_evaluated, true)
FROM public.maturity_models mm
WHERE a.maturity_model_id = mm.id
  AND a.status = 'DRAFT'
  AND COALESCE(a.overall_maturity_level, '') <> 'Draft';

-- Evaluator insight is only persisted by a review endpoint, so these records
-- were reviewed successfully even if the old code left their status pending.
UPDATE public.assessments
SET
    status = 'COMPLETED',
    is_completed = true
WHERE status = 'PENDING_REVIEW'
  AND NULLIF(BTRIM(evaluator_insight), '') IS NOT NULL;

-- Keep the legacy compatibility flag consistent with the authoritative status.
UPDATE public.assessments
SET is_completed = (status = 'COMPLETED')
WHERE is_completed IS DISTINCT FROM (status = 'COMPLETED');
