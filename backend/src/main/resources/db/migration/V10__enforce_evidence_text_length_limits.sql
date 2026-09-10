ALTER TABLE evidence
    ADD CONSTRAINT ck_evidence_description_length
        CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID,
    ADD CONSTRAINT ck_evidence_external_url_length
        CHECK (external_url IS NULL OR char_length(external_url) <= 1000) NOT VALID;
