ALTER TABLE payments ADD COLUMN satoshi_amount INTEGER;
ALTER TABLE payments ADD COLUMN exchange_rate_at_payment REAL;
ALTER TABLE payments ADD COLUMN payment_hash TEXT;
ALTER TABLE payments ADD COLUMN exchange_rate_currency TEXT;
ALTER TABLE payments ADD COLUMN fiat_amount_at_payment REAL;
