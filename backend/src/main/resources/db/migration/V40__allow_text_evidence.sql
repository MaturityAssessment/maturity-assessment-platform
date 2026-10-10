ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_evidence_type_check;
ALTER TABLE evidence ADD CONSTRAINT ck_evidence_type
    CHECK (evidence_type IN ('FILE', 'URL', 'TEXT')) NOT VALID;

ALTER TABLE evidence DROP CONSTRAINT ck_evidence_description_length;
ALTER TABLE evidence ADD CONSTRAINT ck_evidence_description_length
    CHECK (description IS NULL OR char_length(description) <=
        CASE WHEN evidence_type = 'TEXT' THEN 10000 ELSE 500 END) NOT VALID;
