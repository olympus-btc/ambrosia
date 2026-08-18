PRAGMA foreign_keys = ON;

ALTER TABLE config
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/Mexico_City';
