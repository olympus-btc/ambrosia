CREATE INDEX idx_time_entries_project_date
    ON time_entries(project_id, entry_date);

CREATE INDEX idx_time_entries_invoice
    ON time_entries(invoice_id);
