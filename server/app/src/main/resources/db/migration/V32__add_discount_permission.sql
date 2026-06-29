PRAGMA foreign_keys = ON;

WITH new_id AS (SELECT lower(hex(randomblob(16))) AS h)
INSERT INTO permissions (id, name, description, enabled)
SELECT
    substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-' || substr(h, 13, 4) || '-' || substr(h, 17, 4) || '-' || substr(h, 21, 12),
    'orders_discount',
    'Apply discounts to orders',
    1
FROM new_id;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.isAdmin = 1
  AND p.name = 'orders_discount'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
