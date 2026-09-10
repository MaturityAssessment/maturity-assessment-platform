-- Verification query (before/after):
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'assessments'
--   AND column_name IN ('responses', 'evaluator_insight')
-- ORDER BY column_name;
--
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assessments'
          AND column_name = 'responses'
          AND data_type <> 'text'
    ) THEN
        ALTER TABLE public.assessments
            ALTER COLUMN responses TYPE TEXT;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assessments'
          AND column_name = 'evaluator_insight'
          AND data_type <> 'text'
    ) THEN
        ALTER TABLE public.assessments
            ALTER COLUMN evaluator_insight TYPE TEXT;
    END IF;
END $$;
