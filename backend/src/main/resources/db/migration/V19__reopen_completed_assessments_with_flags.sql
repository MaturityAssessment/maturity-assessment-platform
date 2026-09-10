UPDATE assessments assessment
SET status = 'PENDING_REVIEW',
    is_completed = false,
    updated_at = CURRENT_TIMESTAMP
WHERE assessment.status = 'COMPLETED'
  AND EXISTS (
      SELECT 1
      FROM question_evaluations evaluation
      WHERE evaluation.assessment_id = assessment.id
        AND evaluation.validation_status = 'FLAGGED'
  );
