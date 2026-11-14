ALTER TABLE questions
    ADD COLUMN allow_not_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN not_applicable_score DOUBLE PRECISION;

ALTER TABLE questions
    ADD CONSTRAINT ck_question_not_applicable_score CHECK (
        (not_applicable_score IS NULL OR not_applicable_score BETWEEN 0 AND 1)
        AND (NOT allow_not_applicable OR not_applicable_score IS NOT NULL)
    );
