PRAGMA foreign_keys = OFF;

CREATE TABLE clients (
	id BLOB NOT NULL,
	name TEXT NOT NULL,
	currency_id BLOB NOT NULL,
	hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents >= 0),
	billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
	payment_method TEXT NOT NULL CHECK (payment_method IN ('bank', 'lightning')),
	payout_account_id BLOB,
	is_deleted BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id),
	FOREIGN KEY (currency_id) REFERENCES currency(id) ON DELETE RESTRICT,
	FOREIGN KEY (payout_account_id) REFERENCES payout_accounts(id) ON DELETE RESTRICT
);

CREATE TABLE projects (
	id BLOB NOT NULL,
	client_id BLOB NOT NULL,
	name TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'in_progress', 'done', 'paid', 'cancelled')),
	hourly_rate_cents INTEGER CHECK (hourly_rate_cents >= 0),
	is_billable BOOLEAN NOT NULL DEFAULT 1,
	is_deleted BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id),
	FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
);

CREATE TABLE tasks (
	id BLOB NOT NULL,
	name TEXT NOT NULL,
	is_billable BOOLEAN NOT NULL DEFAULT 1,
	is_deleted BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id)
);

CREATE TABLE time_entries (
	id BLOB NOT NULL,
	project_id BLOB NOT NULL,
	task_id BLOB NOT NULL,
	entry_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
	description TEXT,
	duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
	is_billable BOOLEAN NOT NULL DEFAULT 1,
	invoice_id BLOB,
	is_locked BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id),
	FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
	FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
	FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT
);

CREATE TABLE payout_accounts (
    id BLOB NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'lightning')),
    account_holder TEXT,
    bank_name TEXT,
    account_number TEXT,
    currency_id BLOB,
    swift TEXT,
    iban TEXT,
    clabe TEXT,
    lightning_address TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (id),
    FOREIGN KEY (currency_id)
        REFERENCES currency(id)
        ON DELETE RESTRICT
);

CREATE TABLE invoices (
	id BLOB NOT NULL,
	invoice_year INTEGER NOT NULL CHECK (invoice_year >= 0),
  invoice_number TEXT NOT NULL UNIQUE,
	client_id BLOB NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'generated', 'sent', 'paid', 'expired')),
	currency_id BLOB NOT NULL,
	period_start TEXT NOT NULL,
	period_end TEXT NOT NULL,
	total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  payout_snapshot TEXT
    CHECK (
        payout_snapshot IS NULL
        OR json_valid(payout_snapshot)
    ),
	payment_method TEXT NOT NULL CHECK (payment_method IN ('bank', 'lightning')),
	payment_hash TEXT,
	bolt11 TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id),
	FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
	FOREIGN KEY (currency_id) REFERENCES currency(id) ON DELETE RESTRICT
);

CREATE TABLE invoice_line_items (
	id BLOB NOT NULL,
	invoice_id BLOB NOT NULL,
	project_id BLOB NOT NULL,
	task_id BLOB NOT NULL,
	quantity_minutes INTEGER NOT NULL CHECK (quantity_minutes >= 0),
	rate_cents INTEGER NOT NULL CHECK (rate_cents >= 0),
	amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY(id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
	FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
	FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
);

CREATE TABLE invoice_payments (
	payment_id BLOB NOT NULL,
	invoice_id BLOB NOT NULL,
	PRIMARY KEY(payment_id, invoice_id),
	FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
	FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);

PRAGMA foreign_keys = ON;
