PRAGMA foreign_keys = OFF;

CREATE TABLE products_new (
    id                  BLOB PRIMARY KEY,
    sku                 TEXT UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    image_url           TEXT,
    min_stock_threshold INTEGER NOT NULL DEFAULT 0,
    max_stock_threshold INTEGER NOT NULL DEFAULT 0,
    has_variants        INTEGER NOT NULL DEFAULT 0,
    is_deleted          INTEGER NOT NULL DEFAULT 0
);

INSERT INTO products_new (id, sku, name, description, image_url, min_stock_threshold, max_stock_threshold, is_deleted)
SELECT                    id, SKU, name, description, image_url, min_stock_threshold, max_stock_threshold, is_deleted
FROM products;

DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

CREATE TABLE product_option_types (
    id            BLOB NOT NULL PRIMARY KEY,
    product_id    BLOB NOT NULL,
    name          TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE (product_id, name)
);

CREATE TABLE product_option_values (
    id             BLOB NOT NULL PRIMARY KEY,
    option_type_id BLOB NOT NULL,
    value          TEXT NOT NULL,
    display_order  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (option_type_id) REFERENCES product_option_types (id) ON DELETE CASCADE,
    UNIQUE (option_type_id, value)
);

CREATE TABLE product_variants (
    id               BLOB NOT NULL PRIMARY KEY,
    product_id       BLOB NOT NULL,
    sku              TEXT UNIQUE,
    price_cents      INTEGER NOT NULL,
    cost_cents       INTEGER,
    quantity         INTEGER NOT NULL DEFAULT 0,
    is_active        INTEGER NOT NULL DEFAULT 1,
    image_url        TEXT,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE variant_option_values (
    variant_id      BLOB NOT NULL,
    option_value_id BLOB NOT NULL,
    PRIMARY KEY (variant_id, option_value_id),
    FOREIGN KEY (variant_id)      REFERENCES product_variants (id)     ON DELETE CASCADE,
    FOREIGN KEY (option_value_id) REFERENCES product_option_values (id) ON DELETE RESTRICT
);

ALTER TABLE order_products ADD COLUMN variant_id BLOB
    REFERENCES product_variants(id) ON DELETE SET NULL;

PRAGMA foreign_keys = ON;
