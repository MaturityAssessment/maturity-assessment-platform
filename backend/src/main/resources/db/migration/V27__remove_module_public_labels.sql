ALTER TABLE modules
    DROP CONSTRAINT IF EXISTS ck_modules_public_label_code_length,
    DROP CONSTRAINT IF EXISTS ck_modules_public_label_name_length,
    DROP COLUMN IF EXISTS public_label_code,
    DROP COLUMN IF EXISTS public_label_name;
