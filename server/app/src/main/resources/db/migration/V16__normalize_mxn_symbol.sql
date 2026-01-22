PRAGMA foreign_keys = ON;

UPDATE currency
SET symbol = '$'
WHERE acronym = 'MXN' AND symbol = 'Mex$';
