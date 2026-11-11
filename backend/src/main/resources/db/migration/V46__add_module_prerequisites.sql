CREATE TABLE IF NOT EXISTS module_prerequisites (
    module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    prerequisite_order INTEGER NOT NULL,
    prerequisite_module_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (module_id, prerequisite_order),
    UNIQUE (module_id, prerequisite_module_code)
);
