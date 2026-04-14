CREATE TABLE products__new (
    id BLOB PRIMARY KEY,
    SKU TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    cost_cents INTEGER NOT NULL,
    category_id BLOB,
    quantity INTEGER NOT NULL,
    min_stock_threshold INTEGER NOT NULL DEFAULT 0,
    max_stock_threshold INTEGER NOT NULL DEFAULT 0,
    price_cents INTEGER NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
);

INSERT INTO products__new (id, SKU, name, description, image_url, cost_cents, category_id, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted)
SELECT id, SKU, name, description, image_url, cost_cents, category_id, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted FROM products;
DROP TABLE products;
ALTER TABLE products__new RENAME TO products;
