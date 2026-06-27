PRAGMA defer_foreign_keys = ON;

UPDATE role_permissions
SET permission_id = substr(permission_id, 1, 8) || '-' || substr(permission_id, 9, 4) || '-' || substr(permission_id, 13, 4) || '-' || substr(permission_id, 17, 4) || '-' || substr(permission_id, 21, 12)
WHERE length(permission_id) = 32;

UPDATE permissions
SET id = substr(id, 1, 8) || '-' || substr(id, 9, 4) || '-' || substr(id, 13, 4) || '-' || substr(id, 17, 4) || '-' || substr(id, 21, 12)
WHERE length(id) = 32;

UPDATE base_currency
SET currency_id = substr(currency_id, 1, 8) || '-' || substr(currency_id, 9, 4) || '-' || substr(currency_id, 13, 4) || '-' || substr(currency_id, 17, 4) || '-' || substr(currency_id, 21, 12)
WHERE length(currency_id) = 32;

UPDATE payments
SET currency_id = substr(currency_id, 1, 8) || '-' || substr(currency_id, 9, 4) || '-' || substr(currency_id, 13, 4) || '-' || substr(currency_id, 17, 4) || '-' || substr(currency_id, 21, 12)
WHERE length(currency_id) = 32;

UPDATE currency
SET id = substr(id, 1, 8) || '-' || substr(id, 9, 4) || '-' || substr(id, 13, 4) || '-' || substr(id, 17, 4) || '-' || substr(id, 21, 12)
WHERE length(id) = 32;
