PRAGMA foreign_keys = ON;

CREATE TABLE ticket_template_elements__new (
    id BLOB PRIMARY KEY,
    template_id BLOB NOT NULL,
    element_order INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HEADER','TEXT','LINE_BREAK','SEPARATOR','TABLE_HEADER','TABLE_ROW','FOOTER','QRCODE')),
    value TEXT,
    style_bold BOOLEAN NOT NULL DEFAULT 0,
    style_justification TEXT NOT NULL DEFAULT 'LEFT' CHECK(style_justification IN ('LEFT','CENTER','RIGHT')),
    style_font_size TEXT NOT NULL DEFAULT 'NORMAL' CHECK(style_font_size IN ('NORMAL','LARGE','EXTRA_LARGE')),
    FOREIGN KEY (template_id) REFERENCES ticket_templates (id) ON DELETE CASCADE
);

INSERT INTO ticket_template_elements__new (id, template_id, element_order, type, value, style_bold, style_justification, style_font_size)
SELECT id, template_id, element_order, type, value, style_bold, style_justification, style_font_size
FROM ticket_template_elements;

DROP TABLE ticket_template_elements;
ALTER TABLE ticket_template_elements__new RENAME TO ticket_template_elements;
