PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 1;
