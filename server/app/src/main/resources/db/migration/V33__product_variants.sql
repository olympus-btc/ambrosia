PRAGMA foreign_keys = OFF;

CREATE TABLE products_new (
    id                  BLOB PRIMARY KEY,
    sku                 TEXT UNIQUE,
    name                TEXT NOT NULL,
    description         TEXT,
    image_url           TEXT,
    min_stock_threshold INTEGER NOT NULL DEFAULT 0,
    max_stock_threshold INTEGER NOT NULL DEFAULT 0,
    quantity            INTEGER NOT NULL DEFAULT 0,
    has_variants        INTEGER NOT NULL DEFAULT 0,
    is_deleted          INTEGER NOT NULL DEFAULT 0
);

INSERT INTO products_new (id, sku, name, description, image_url, min_stock_threshold, max_stock_threshold, quantity, is_deleted)
SELECT                    id, SKU, name, description, image_url, min_stock_threshold, max_stock_threshold, quantity, is_deleted
FROM products;

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

INSERT INTO product_variants (id, product_id, price_cents, cost_cents, quantity, is_active)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', (abs(random()) % 4) + 1, 1) ||
    substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    id,
    COALESCE(price_cents, 0),
    cost_cents,
    quantity,
    1
FROM products
WHERE is_deleted = 0;

DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

CREATE TABLE order_products_new (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id       BLOB NOT NULL,
    product_id     BLOB NOT NULL,
    variant_id     BLOB,
    quantity       INTEGER NOT NULL DEFAULT 1,
    price_at_order INTEGER NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE SET NULL
);

INSERT INTO order_products_new (order_id, product_id, variant_id, quantity, price_at_order)
    SELECT order_id, product_id, NULL, quantity, price_at_order FROM order_products;

DROP TABLE order_products;
ALTER TABLE order_products_new RENAME TO order_products;

PRAGMA foreign_keys = ON;
