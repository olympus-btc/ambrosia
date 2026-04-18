CREATE TABLE order_products (
    order_id BLOB NOT NULL,
    product_id BLOB NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_order INTEGER NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
