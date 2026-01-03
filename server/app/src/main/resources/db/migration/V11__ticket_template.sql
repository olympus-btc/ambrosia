PRAGMA foreign_keys = ON;

CREATE TABLE ticket_templates (
    id BLOB PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE ticket_template_elements (
    id BLOB PRIMARY KEY,
    template_id BLOB NOT NULL,
    element_order INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HEADER','TEXT','LINE_BREAK','SEPARATOR','TABLE_HEADER','TABLE_ROW','FOOTER')),
    value TEXT,
    style_bold BOOLEAN NOT NULL DEFAULT 0,
    style_justification TEXT NOT NULL DEFAULT 'LEFT' CHECK(style_justification IN ('LEFT','CENTER','RIGHT')),
    style_font_size TEXT NOT NULL DEFAULT 'NORMAL' CHECK(style_font_size IN ('NORMAL','LARGE','EXTRA_LARGE')),
    FOREIGN KEY (template_id) REFERENCES ticket_templates (id) ON DELETE CASCADE
);