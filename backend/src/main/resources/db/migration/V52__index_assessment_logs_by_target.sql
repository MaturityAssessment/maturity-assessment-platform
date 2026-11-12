-- Support question filtering without scanning the assessment's full activity history.
CREATE INDEX idx_assessment_logs_target_history
    ON assessment_logs (assessment_id, target_type, target_id, occurred_at DESC, id DESC);
