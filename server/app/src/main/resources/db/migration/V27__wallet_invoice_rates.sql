CREATE TABLE wallet_invoice_rates (
    payment_hash TEXT PRIMARY KEY,
    satoshi_amount INTEGER,
    exchange_rate REAL NOT NULL,
    exchange_rate_currency TEXT NOT NULL,
    fiat_amount REAL,
    created_at DATETIME DEFAULT (datetime('now'))
);
