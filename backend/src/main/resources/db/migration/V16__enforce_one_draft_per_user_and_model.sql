CREATE UNIQUE INDEX IF NOT EXISTS ux_assessments_user_model_draft
    ON assessments (user_id, maturity_model_id)
    WHERE status = 'DRAFT'
      AND user_id IS NOT NULL
      AND maturity_model_id IS NOT NULL;
