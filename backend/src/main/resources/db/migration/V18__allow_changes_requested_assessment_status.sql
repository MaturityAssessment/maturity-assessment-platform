ALTER TABLE assessments
    DROP CONSTRAINT IF EXISTS assessments_status_check;

ALTER TABLE assessments
    ADD CONSTRAINT assessments_status_check
        CHECK (status IN (
            'DRAFT',
            'PENDING_REVIEW',
            'CHANGES_REQUESTED',
            'COMPLETED'
        ));
