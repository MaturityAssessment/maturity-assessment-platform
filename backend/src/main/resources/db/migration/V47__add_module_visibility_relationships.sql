CREATE TABLE IF NOT EXISTS module_corequisites (
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    relationship_order INTEGER NOT NULL,
    related_module_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (module_id, relationship_order),
    UNIQUE (module_id, related_module_code)
);

CREATE TABLE IF NOT EXISTS module_mutex (
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    relationship_order INTEGER NOT NULL,
    related_module_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (module_id, relationship_order),
    UNIQUE (module_id, related_module_code)
);

