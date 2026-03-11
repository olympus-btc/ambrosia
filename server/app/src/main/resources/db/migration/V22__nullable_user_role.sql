-- Make role_id nullable in users table to support role deletion without deleting users
-- SQLite does not support DROP NOT NULL directly, so we recreate the table

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
    id BLOB PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL,
    refresh_token TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    role_id BLOB,
    email TEXT,
    phone TEXT,
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL
);

INSERT INTO users_new (id, name, pin, refresh_token, is_deleted, role_id, email, phone)
SELECT id, name, pin, refresh_token, is_deleted, role_id, email, phone FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

PRAGMA foreign_keys = ON;
