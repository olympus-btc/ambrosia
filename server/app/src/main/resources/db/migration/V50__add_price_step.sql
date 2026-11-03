PRAGMA foreign_keys = ON;

ALTER TABLE config ADD COLUMN price_step REAL NOT NULL DEFAULT 0.01;
