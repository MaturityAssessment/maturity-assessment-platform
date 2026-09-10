ALTER TABLE domains ADD COLUMN icon_key VARCHAR(32);
ALTER TABLE domains ADD COLUMN color_key VARCHAR(32);

UPDATE domains
SET icon_key = CASE
    WHEN lower(name) ~ '(security|cyber|risk)' THEN 'shield'
    WHEN lower(name) ~ '(software|development|devops|code)' THEN 'code'
    WHEN lower(name) ~ '(data|analytics|information)' THEN 'database'
    WHEN lower(name) ~ '(people|culture|workforce)' THEN 'users'
    WHEN lower(name) ~ '(operations|operation|process|service)' THEN 'settings'
    WHEN lower(name) ~ '(strategy|transformation)' THEN 'compass'
    ELSE 'layers'
END
WHERE icon_key IS NULL;

UPDATE domains
SET color_key = (ARRAY['blue', 'emerald', 'violet', 'amber', 'rose', 'slate'])[
    1 + mod(hashtext(lower(trim(name)))::bigint + 2147483648, 6)::integer
]
WHERE color_key IS NULL;

ALTER TABLE domains ALTER COLUMN icon_key SET NOT NULL;
ALTER TABLE domains ALTER COLUMN color_key SET NOT NULL;
