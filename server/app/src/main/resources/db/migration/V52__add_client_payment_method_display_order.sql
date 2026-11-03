PRAGMA foreign_keys = ON;

ALTER TABLE client_payment_methods
    ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
