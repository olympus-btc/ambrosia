PRAGMA foreign_keys = ON;

CREATE TABLE admin_notifications (
    id              BLOB PRIMARY KEY,
    category        TEXT NOT NULL,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    actor_user_id   BLOB,
    actor_user_name TEXT,
    actor_role      TEXT,
    status          TEXT,
    occurred_at     TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    dedupe_key      TEXT UNIQUE,
    metadata_json   TEXT,
    FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE admin_notification_receipts (
    notification_id BLOB NOT NULL,
    admin_user_id   BLOB NOT NULL,
    read_at         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (notification_id, admin_user_id),
    FOREIGN KEY (notification_id) REFERENCES admin_notifications (id) ON DELETE CASCADE,
    FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE admin_notification_preferences (
    admin_user_id BLOB NOT NULL,
    category      TEXT NOT NULL,
    in_app_enabled INTEGER NOT NULL DEFAULT 1,
    push_enabled   INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (admin_user_id, category),
    FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
    id            BLOB PRIMARY KEY,
    admin_user_id BLOB NOT NULL,
    endpoint      TEXT NOT NULL UNIQUE,
    p256dh        TEXT NOT NULL,
    auth          TEXT NOT NULL,
    user_agent    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at    TEXT,
    FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE
);
