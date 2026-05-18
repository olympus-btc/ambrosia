PRAGMA foreign_keys = OFF;

CREATE TABLE products_new (
    id BLOB PRIMARY KEY,
    SKU TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    cost_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    min_stock_threshold INTEGER NOT NULL DEFAULT 0,
    max_stock_threshold INTEGER NOT NULL DEFAULT 0,
    price_cents INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0
);

INSERT INTO products_new (id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted)
SELECT id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted
FROM products;

DROP TABLE products;

ALTER TABLE products_new RENAME TO products;

PRAGMA foreign_keys = ON;
