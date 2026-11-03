package pos.ambrosia.utest

import org.junit.Test
import java.nio.file.Files
import java.sql.DriverManager
import java.sql.SQLException
import java.sql.Statement
import kotlin.io.path.deleteIfExists
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PrinterCashDrawerMigrationTest {
    @Test
    fun `V57 gives existing printers the cash drawer turned off with pin 2`() {
        withPrinterDatabase { databaseStatement ->
            databaseStatement.execute(
                "INSERT INTO printer_configs (id, printer_type, printer_name) VALUES (X'01', 'CUSTOMER', 'alice-printer')",
            )

            applyMigration(databaseStatement, "V57__printer_cash_drawer.sql")

            databaseStatement
                .executeQuery(
                    "SELECT cash_drawer_enabled, cash_drawer_pin, open_cash_drawer_on_refund, open_cash_drawer_on_shift_open, " +
                        "open_cash_drawer_on_shift_close FROM printer_configs",
                ).use { printerRows ->
                    printerRows.next()
                    assertEquals(false, printerRows.getBoolean("cash_drawer_enabled"))
                    assertEquals("PIN_2", printerRows.getString("cash_drawer_pin"))
                    assertEquals(true, printerRows.getBoolean("open_cash_drawer_on_refund"))
                    assertEquals(true, printerRows.getBoolean("open_cash_drawer_on_shift_open"))
                    assertEquals(true, printerRows.getBoolean("open_cash_drawer_on_shift_close"))
                }
        }
    }

    @Test
    fun `V57 rejects an unknown cash drawer pin`() {
        withPrinterDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V57__printer_cash_drawer.sql")

            assertFailsWith<SQLException> {
                databaseStatement.execute(
                    "INSERT INTO printer_configs (id, printer_type, printer_name, cash_drawer_pin) VALUES (X'02', 'CUSTOMER', 'bob-printer', 'PIN_9')",
                )
            }
        }
    }

    @Test
    fun `V57 grants the cash_drawer_open permission to admin roles only`() {
        withPrinterDatabase { databaseStatement ->
            databaseStatement.execute("INSERT INTO roles (id, role, isAdmin) VALUES ('admin-role', 'Admin', 1)")
            databaseStatement.execute("INSERT INTO roles (id, role, isAdmin) VALUES ('cashier-role', 'Cashier', 0)")

            applyMigration(databaseStatement, "V57__printer_cash_drawer.sql")

            databaseStatement
                .executeQuery(
                    "SELECT rp.role_id FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.name = 'cash_drawer_open'",
                ).use { grantedRoleRows ->
                    val grantedRoleIds = buildList { while (grantedRoleRows.next()) add(grantedRoleRows.getString("role_id")) }
                    assertEquals(listOf("admin-role"), grantedRoleIds)
                }
        }
    }

    private fun withPrinterDatabase(runAssertions: (Statement) -> Unit) {
        val databasePath = Files.createTempFile("ambrosia-printer-cash-drawer-test", ".db")
        try {
            DriverManager.getConnection("jdbc:sqlite:$databasePath").use { databaseConnection ->
                databaseConnection.createStatement().use { databaseStatement ->
                    applyMigration(databaseStatement, "V13__printer_config.sql")
                    databaseStatement.execute("CREATE TABLE payment_methods (id BLOB PRIMARY KEY, name TEXT NOT NULL UNIQUE)")
                    databaseStatement.execute(
                        "CREATE TABLE roles (id TEXT PRIMARY KEY, role TEXT NOT NULL, isAdmin BOOLEAN NOT NULL DEFAULT 0)",
                    )
                    databaseStatement.execute(
                        "CREATE TABLE permissions (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, enabled BOOLEAN NOT NULL DEFAULT 1)",
                    )
                    databaseStatement.execute("CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL)")
                    runAssertions(databaseStatement)
                }
            }
        } finally {
            databasePath.deleteIfExists()
        }
    }

    private fun applyMigration(
        databaseStatement: Statement,
        migrationFileName: String,
    ) {
        checkNotNull(javaClass.classLoader.getResource("db/migration/$migrationFileName"))
            .readText()
            .split(';')
            .map(String::trim)
            .filter(String::isNotEmpty)
            .forEach(databaseStatement::execute)
    }
}
