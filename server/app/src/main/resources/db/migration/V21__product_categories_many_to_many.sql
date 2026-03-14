CREATE TEMPORARY TABLE product_categories_temp AS
SELECT CAST(id AS TEXT) AS product_id, CAST(category_id AS TEXT) AS category_id
FROM products WHERE category_id IS NOT NULL AND is_deleted = 0;

CREATE TABLE products__new (
    id BLOB PRIMARY KEY,
    SKU TEXT NOT NULL UNIQUE,
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

INSERT INTO products__new (id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted)
SELECT id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents, is_deleted FROM products;

DROP TABLE products;
ALTER TABLE products__new RENAME TO products;

CREATE TABLE product_categories (
    product_id BLOB NOT NULL,
    category_id BLOB NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

INSERT INTO product_categories (product_id, category_id)
SELECT product_id, category_id FROM product_categories_temp;

DROP TABLE product_categories_temp;
