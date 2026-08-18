PRAGMA foreign_keys = ON;

ALTER TABLE refunds ADD COLUMN payment_hash TEXT;
