DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dimensions'
          AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.dimensions
            ADD COLUMN sort_order integer;

        WITH ordered_dimensions AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY maturity_model_id
                    ORDER BY id
                ) - 1 AS next_sort_order
            FROM public.dimensions
        )
        UPDATE public.dimensions d
        SET sort_order = od.next_sort_order
        FROM ordered_dimensions od
        WHERE d.id = od.id;
    END IF;

    UPDATE public.dimensions
    SET sort_order = 0
    WHERE sort_order IS NULL;

    ALTER TABLE public.dimensions
        ALTER COLUMN sort_order SET DEFAULT 0,
        ALTER COLUMN sort_order SET NOT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'modules'
          AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.modules
            ADD COLUMN sort_order integer;

        WITH ordered_modules AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY dimension_id
                    ORDER BY id
                ) - 1 AS next_sort_order
            FROM public.modules
        )
        UPDATE public.modules m
        SET sort_order = om.next_sort_order
        FROM ordered_modules om
        WHERE m.id = om.id;
    END IF;

    UPDATE public.modules
    SET sort_order = 0
    WHERE sort_order IS NULL;

    ALTER TABLE public.modules
        ALTER COLUMN sort_order SET DEFAULT 0,
        ALTER COLUMN sort_order SET NOT NULL;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'modules'
          AND column_name = 'weight'
    ) THEN
        ALTER TABLE public.modules
            ALTER COLUMN weight TYPE double precision USING weight::double precision,
            ALTER COLUMN weight SET DEFAULT 1.0,
            ALTER COLUMN weight SET NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'practices'
          AND column_name = 'weight'
    ) THEN
        ALTER TABLE public.practices
            ALTER COLUMN weight TYPE double precision USING weight::double precision,
            ALTER COLUMN weight SET DEFAULT 1.0,
            ALTER COLUMN weight SET NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'questions'
          AND column_name = 'weight'
    ) THEN
        ALTER TABLE public.questions
            ALTER COLUMN weight TYPE double precision USING weight::double precision,
            ALTER COLUMN weight SET DEFAULT 1.0,
            ALTER COLUMN weight SET NOT NULL;
    END IF;
END $$;
