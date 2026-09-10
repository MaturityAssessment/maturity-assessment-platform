UPDATE questions
SET type = 'evidence',
    requires_evidence = TRUE
WHERE type IN ('file_evidence', 'link_evidence');
