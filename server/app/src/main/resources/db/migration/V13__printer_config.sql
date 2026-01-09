PRAGMA foreign_keys = ON;

CREATE TABLE printer_configs (
    id BLOB PRIMARY KEY,
    printer_type TEXT NOT NULL CHECK(printer_type IN ('KITCHEN','CUSTOMER','BAR')),
    printer_name TEXT NOT NULL,
    template_name TEXT,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX printer_configs_unique_type_name
    ON printer_configs(printer_type, printer_name);

CREATE UNIQUE INDEX printer_configs_default_per_type
    ON printer_configs(printer_type) WHERE is_default = 1;
