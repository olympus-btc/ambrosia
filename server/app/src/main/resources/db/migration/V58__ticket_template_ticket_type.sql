PRAGMA foreign_keys = ON;

ALTER TABLE ticket_templates ADD COLUMN ticket_type TEXT NOT NULL DEFAULT 'RECEIPT' CHECK(ticket_type IN ('RECEIPT','SHIFT_CLOSE'));

ALTER TABLE ticket_templates ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX ticket_templates_default_per_ticket_type
    ON ticket_templates(ticket_type) WHERE is_default = 1;

CREATE TABLE ticket_template_elements__new (
    id BLOB PRIMARY KEY,
    template_id BLOB NOT NULL,
    element_order INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('HEADER','TEXT','LINE_BREAK','SEPARATOR','TABLE_HEADER','TABLE_ROW','TOTAL_ROW','FOOTER','QRCODE','LOGO','PAYMENT_METHOD','SHIFT_SUMMARY')),
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

UPDATE ticket_templates
SET is_default = 1
WHERE id = (
    SELECT ticket_templates.id
    FROM printer_configs
    JOIN ticket_templates ON ticket_templates.name = printer_configs.template_name
    WHERE printer_configs.printer_type = 'CUSTOMER'
    ORDER BY printer_configs.is_default DESC, printer_configs.enabled DESC, printer_configs.created_at ASC
    LIMIT 1
);

UPDATE ticket_templates
SET is_default = 1
WHERE rowid = (SELECT MIN(rowid) FROM ticket_templates WHERE ticket_type = 'RECEIPT')
  AND NOT EXISTS (SELECT 1 FROM ticket_templates WHERE ticket_type = 'RECEIPT' AND is_default = 1);

INSERT INTO ticket_templates (id, name, ticket_type, is_default)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', (abs(random()) % 4) + 1, 1) ||
    substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    'Corte Z',
    'SHIFT_CLOSE',
    1
WHERE NOT EXISTS (SELECT 1 FROM ticket_templates WHERE name = 'Corte Z');

INSERT INTO ticket_template_elements (id, template_id, element_order, type, value, style_bold, style_justification, style_font_size)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', (abs(random()) % 4) + 1, 1) ||
    substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    shift_close_template.id,
    shift_close_elements.element_order,
    shift_close_elements.type,
    shift_close_elements.value,
    shift_close_elements.style_bold,
    shift_close_elements.style_justification,
    shift_close_elements.style_font_size
FROM ticket_templates AS shift_close_template
CROSS JOIN (
    SELECT 0 AS element_order, 'HEADER' AS type, '{{config.businessName}}' AS value, 1 AS style_bold, 'CENTER' AS style_justification, 'LARGE' AS style_font_size
    UNION ALL SELECT 1, 'SEPARATOR', '', 0, 'LEFT', 'NORMAL'
    UNION ALL SELECT 2, 'SHIFT_SUMMARY', '', 0, 'LEFT', 'NORMAL'
    UNION ALL SELECT 3, 'SEPARATOR', '', 0, 'LEFT', 'NORMAL'
    UNION ALL SELECT 4, 'TEXT', '{{print.dateTime}}', 0, 'CENTER', 'NORMAL'
) AS shift_close_elements
WHERE shift_close_template.ticket_type = 'SHIFT_CLOSE'
  AND shift_close_template.is_default = 1
  AND NOT EXISTS (
      SELECT 1 FROM ticket_template_elements WHERE template_id = shift_close_template.id
  );
