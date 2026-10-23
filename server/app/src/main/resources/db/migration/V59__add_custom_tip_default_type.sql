PRAGMA foreign_keys = ON;

ALTER TABLE config ADD COLUMN custom_tip_default_type TEXT NOT NULL DEFAULT 'percentage';
