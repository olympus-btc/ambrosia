PRAGMA foreign_keys = ON;

ALTER TABLE payments ADD COLUMN lightning_fee_sat INTEGER;
