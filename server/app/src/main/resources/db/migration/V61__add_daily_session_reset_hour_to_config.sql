PRAGMA foreign_keys = ON;

ALTER TABLE config ADD COLUMN daily_session_reset_hour INTEGER NOT NULL DEFAULT 6;
