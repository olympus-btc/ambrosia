PRAGMA foreign_keys = ON;

ALTER TABLE client_payment_methods
    ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
