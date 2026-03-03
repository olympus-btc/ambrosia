PRAGMA foreign_keys = ON;

ALTER TABLE shifts ADD COLUMN initial_amount REAL DEFAULT 0.0;
ALTER TABLE shifts ADD COLUMN final_amount REAL;
