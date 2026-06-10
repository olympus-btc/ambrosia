PRAGMA foreign_keys = OFF;

CREATE TABLE payments_new (
    id BLOB PRIMARY KEY,
    method_id BLOB NOT NULL,
    currency_id BLOB NOT NULL,
    transaction_id BLOB NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    satoshi_amount INTEGER,
    exchange_rate_at_payment REAL,
    payment_hash TEXT UNIQUE,
    exchange_rate_currency TEXT,
    fiat_amount_at_payment REAL,
    FOREIGN KEY (method_id) REFERENCES payment_methods (id) ON DELETE RESTRICT
);

INSERT INTO payments_new
    SELECT id, method_id, currency_id, transaction_id, amount, date,
           satoshi_amount, exchange_rate_at_payment, payment_hash,
           exchange_rate_currency, fiat_amount_at_payment
    FROM payments;

DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;

PRAGMA foreign_keys = ON;
