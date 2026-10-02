PRAGMA foreign_keys = ON;

CREATE TABLE client_payment_methods (
    client_id BLOB NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank', 'lightning')),
    PRIMARY KEY (client_id, payment_method),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

INSERT INTO client_payment_methods (client_id, payment_method)
SELECT id, payment_method
FROM clients
WHERE payment_method IS NOT NULL
  AND trim(payment_method) != '';
