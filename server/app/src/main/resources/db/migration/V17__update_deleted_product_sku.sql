UPDATE products
SET SKU = 'DELETED-' || CAST(id AS TEXT)
WHERE is_deleted = 1
  AND SKU NOT LIKE 'DELETED-%';
