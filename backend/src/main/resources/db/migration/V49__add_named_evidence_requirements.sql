CREATE TABLE practice_evidence_requirements (
    practice_id BIGINT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    instructions TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    format VARCHAR(20) NOT NULL DEFAULT 'FILE_OR_URL'
        CHECK (format IN ('FILE', 'URL', 'FILE_OR_URL', 'ANY')),
    PRIMARY KEY (practice_id, sort_order),
    UNIQUE (practice_id, code)
);

ALTER TABLE evidence ADD COLUMN requirement_code VARCHAR(64);
ALTER TABLE evidence ADD COLUMN evidence_date DATE;

-- Preserve existing requirements and evidence without inventing source dates.
INSERT INTO practice_evidence_requirements (practice_id, sort_order, code, name, instructions, required, format)
SELECT id, 0, 'supporting-evidence', 'Supporting evidence',
       'Provide evidence supporting this practice. Use the document approval date or reporting-period end as the evidence date.',
       TRUE, 'ANY'
FROM practices WHERE requires_evidence = TRUE;

UPDATE evidence e SET requirement_code = 'supporting-evidence'
FROM practices p WHERE e.practice_id = p.id AND p.requires_evidence = TRUE;

ALTER TABLE evidence ADD CONSTRAINT fk_evidence_requirement
    FOREIGN KEY (practice_id, requirement_code)
    REFERENCES practice_evidence_requirements (practice_id, code);
