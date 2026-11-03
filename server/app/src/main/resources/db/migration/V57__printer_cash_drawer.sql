PRAGMA foreign_keys = ON;

ALTER TABLE printer_configs ADD COLUMN cash_drawer_enabled BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE printer_configs ADD COLUMN cash_drawer_pin TEXT NOT NULL DEFAULT 'PIN_2' CHECK(cash_drawer_pin IN ('PIN_2','PIN_5'));
ALTER TABLE printer_configs ADD COLUMN open_cash_drawer_on_refund BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE printer_configs ADD COLUMN open_cash_drawer_on_shift_open BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE printer_configs ADD COLUMN open_cash_drawer_on_shift_close BOOLEAN NOT NULL DEFAULT 1;

CREATE TABLE printer_config_cash_drawer_payment_methods (
    printer_config_id BLOB NOT NULL,
    payment_method_id BLOB NOT NULL,
    PRIMARY KEY (printer_config_id, payment_method_id),
    FOREIGN KEY (printer_config_id) REFERENCES printer_configs (id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id) ON DELETE CASCADE
);

WITH new_id AS (SELECT lower(hex(randomblob(16))) AS h)
INSERT INTO permissions (id, name, description, enabled)
SELECT
    substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-' || substr(h, 13, 4) || '-' || substr(h, 17, 4) || '-' || substr(h, 21, 12),
    'cash_drawer_open',
    'Open the cash drawer without a sale',
    1
FROM new_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.isAdmin = 1
  AND p.name = 'cash_drawer_open'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
