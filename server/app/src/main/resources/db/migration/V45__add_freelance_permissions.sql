PRAGMA foreign_keys = ON;

WITH permission_specs (name, description) AS (
    VALUES
        ('clients_read', 'List and view freelance clients'),
        ('clients_create', 'Create freelance clients'),
        ('clients_update', 'Update freelance clients'),
        ('clients_delete', 'Delete freelance clients'),
        ('projects_read', 'List and view freelance projects'),
        ('projects_create', 'Create freelance projects'),
        ('projects_update', 'Update freelance projects'),
        ('projects_delete', 'Delete freelance projects'),
        ('tasks_read', 'List and view freelance tasks'),
        ('tasks_create', 'Create freelance tasks'),
        ('tasks_update', 'Update freelance tasks'),
        ('tasks_delete', 'Delete freelance tasks'),
        ('time_entries_read', 'List and view freelance time entries'),
        ('time_entries_create', 'Create freelance time entries'),
        ('time_entries_update', 'Update freelance time entries'),
        ('time_entries_delete', 'Delete freelance time entries'),
        ('payout_accounts_read', 'List and view freelance payout accounts'),
        ('payout_accounts_create', 'Create freelance payout accounts'),
        ('payout_accounts_update', 'Update freelance payout accounts'),
        ('payout_accounts_delete', 'Delete freelance payout accounts'),
        ('invoices_read', 'List and view freelance invoices'),
        ('invoices_create', 'Create freelance invoices'),
        ('invoices_update', 'Update freelance invoices'),
        ('invoices_pay', 'Register payments for freelance invoices'),
        ('freelance_reports_read', 'View freelance reports'),
        ('freelance_reports_export', 'Export freelance reports')
)
INSERT INTO permissions (id, name, description, enabled)
SELECT
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    lower(hex(randomblob(6))),
    name,
    description,
    1
FROM permission_specs;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.isAdmin = 1
  AND p.name IN (
      'clients_read',
      'clients_create',
      'clients_update',
      'clients_delete',
      'projects_read',
      'projects_create',
      'projects_update',
      'projects_delete',
      'tasks_read',
      'tasks_create',
      'tasks_update',
      'tasks_delete',
      'time_entries_read',
      'time_entries_create',
      'time_entries_update',
      'time_entries_delete',
      'payout_accounts_read',
      'payout_accounts_create',
      'payout_accounts_update',
      'payout_accounts_delete',
      'invoices_read',
      'invoices_create',
      'invoices_update',
      'invoices_pay',
      'freelance_reports_read',
      'freelance_reports_export'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
  );
