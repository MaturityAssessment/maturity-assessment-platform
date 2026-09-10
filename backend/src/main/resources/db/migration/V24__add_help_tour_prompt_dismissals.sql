ALTER TABLE users
    ADD COLUMN dismissed_help_tour_prompts JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT ck_users_dismissed_help_tour_prompts_object
        CHECK (jsonb_typeof(dismissed_help_tour_prompts) = 'object');
