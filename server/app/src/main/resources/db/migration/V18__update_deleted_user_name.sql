UPDATE users
SET name = 'DELETED-' || CAST(id AS TEXT)
WHERE is_deleted = 1
  AND name NOT LIKE 'DELETED-%';
