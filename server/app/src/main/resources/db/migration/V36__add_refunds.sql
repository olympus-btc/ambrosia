PRAGMA foreign_keys = OFF;

CREATE TABLE orders_new (
    id BLOB PRIMARY KEY,
    user_id BLOB NOT NULL,
    table_id BLOB,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'refunded')),
    total REAL NOT NULL DEFAULT 0.00,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    discount_amount DOUBLE NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (table_id) REFERENCES tables (id)
);

INSERT INTO orders_new (id, user_id, table_id, status, total, created_at, is_deleted, discount_amount)
SELECT id, user_id, table_id, status, total, created_at, is_deleted, discount_amount
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE TABLE refunds (
    id BLOB PRIMARY KEY,
    order_id BLOB NOT NULL UNIQUE REFERENCES orders(id),
    refund_invoice TEXT NOT NULL DEFAULT '',
    satoshi_amount INTEGER NOT NULL DEFAULT 0,
    refunded_at TEXT NOT NULL
);

PRAGMA foreign_keys = ON;
