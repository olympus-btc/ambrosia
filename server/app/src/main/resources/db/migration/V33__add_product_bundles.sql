PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN is_bundle INTEGER NOT NULL DEFAULT 0;

CREATE TABLE product_bundle_components (
    bundle_id    BLOB NOT NULL,
    component_id BLOB NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (bundle_id, component_id),
    FOREIGN KEY (bundle_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES products (id) ON DELETE RESTRICT
);
