package pos.ambrosia.utest

import org.junit.Test
import java.nio.file.Files
import java.sql.DriverManager
import java.sql.SQLException
import java.sql.Statement
import kotlin.io.path.deleteIfExists
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class TicketTemplateMigrationsTest {
    @Test
    fun `V53 allows TOTAL_ROW elements and preserves existing elements`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            applyMigration(databaseStatement, "V14__ticket_template_qrcode.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")
            databaseStatement.execute(insertElementSql(elementId = "02", elementType = "QRCODE"))

            applyMigration(databaseStatement, "V53__ticket_template_total_row.sql")
            databaseStatement.execute(insertElementSql(elementId = "03", elementType = "TOTAL_ROW"))

            assertEquals(listOf("QRCODE", "TOTAL_ROW"), storedElementTypes(databaseStatement))
        }
    }

    @Test
    fun `V53 still rejects unknown element types`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            applyMigration(databaseStatement, "V14__ticket_template_qrcode.sql")
            applyMigration(databaseStatement, "V53__ticket_template_total_row.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'bob')")

            assertFailsWith<SQLException> {
                databaseStatement.execute(insertElementSql(elementId = "02", elementType = "UNKNOWN"))
            }
        }
    }

    @Test
    fun `V55 allows LOGO elements and preserves existing elements`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            applyMigration(databaseStatement, "V14__ticket_template_qrcode.sql")
            applyMigration(databaseStatement, "V53__ticket_template_total_row.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")
            databaseStatement.execute(insertElementSql(elementId = "02", elementType = "TOTAL_ROW"))

            applyMigration(databaseStatement, "V55__ticket_template_logo.sql")
            databaseStatement.execute(insertElementSql(elementId = "03", elementType = "LOGO"))

            assertEquals(listOf("TOTAL_ROW", "LOGO"), storedElementTypes(databaseStatement))
        }
    }

    @Test
    fun `V56 allows PAYMENT_METHOD elements and preserves existing elements`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            applyMigration(databaseStatement, "V14__ticket_template_qrcode.sql")
            applyMigration(databaseStatement, "V53__ticket_template_total_row.sql")
            applyMigration(databaseStatement, "V55__ticket_template_logo.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")
            databaseStatement.execute(insertElementSql(elementId = "02", elementType = "LOGO"))

            applyMigration(databaseStatement, "V56__ticket_template_payment_method.sql")
            databaseStatement.execute(insertElementSql(elementId = "03", elementType = "PAYMENT_METHOD"))

            assertEquals(listOf("LOGO", "PAYMENT_METHOD"), storedElementTypes(databaseStatement))
        }
    }

    @Test
    fun `V54 gives existing templates the default date and time formats`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")

            applyMigration(databaseStatement, "V54__ticket_template_date_time_formats.sql")

            databaseStatement.executeQuery("SELECT date_format, time_format FROM ticket_templates").use { queryRows ->
                queryRows.next()
                assertEquals("DAY_MONTH_YEAR", queryRows.getString("date_format"))
                assertEquals("HOURS_24", queryRows.getString("time_format"))
            }
        }
    }

    @Test
    fun `V54 rejects unknown date and time formats`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyMigration(databaseStatement, "V11__ticket_template.sql")
            applyMigration(databaseStatement, "V54__ticket_template_date_time_formats.sql")

            assertFailsWith<SQLException> {
                databaseStatement.execute("INSERT INTO ticket_templates (id, name, date_format) VALUES (X'01', 'bob', 'UNKNOWN')")
            }
            assertFailsWith<SQLException> {
                databaseStatement.execute("INSERT INTO ticket_templates (id, name, time_format) VALUES (X'02', 'eve', 'UNKNOWN')")
            }
        }
    }

    @Test
    fun `V58 makes the template of the default customer printer the default receipt and seeds the shift close template`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyTicketTemplateMigrationsUntilV56(databaseStatement)
            applyMigration(databaseStatement, "V13__printer_config.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'02', 'bob')")
            databaseStatement.execute(
                "INSERT INTO printer_configs (id, printer_type, printer_name, template_name, is_default) " +
                    "VALUES (X'10', 'CUSTOMER', 'eve-printer', 'alice', 0), (X'11', 'CUSTOMER', 'mallory-printer', 'bob', 1)",
            )

            applyMigration(databaseStatement, "V58__ticket_template_ticket_type.sql")

            assertEquals(
                listOf("Corte Z|SHIFT_CLOSE|1", "alice|RECEIPT|0", "bob|RECEIPT|1"),
                storedTemplates(databaseStatement),
            )
            assertEquals(
                listOf("HEADER", "SEPARATOR", "SHIFT_SUMMARY", "SEPARATOR", "TEXT"),
                storedElementTypes(databaseStatement),
            )
        }
    }

    @Test
    fun `V58 makes the oldest template the default receipt when no customer printer has a template`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyTicketTemplateMigrationsUntilV56(databaseStatement)
            applyMigration(databaseStatement, "V13__printer_config.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'02', 'bob')")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name) VALUES (X'01', 'alice')")

            applyMigration(databaseStatement, "V58__ticket_template_ticket_type.sql")

            assertEquals(
                listOf("Corte Z|SHIFT_CLOSE|1", "alice|RECEIPT|0", "bob|RECEIPT|1"),
                storedTemplates(databaseStatement),
            )
        }
    }

    @Test
    fun `V58 allows only one default template per ticket type`() {
        withTicketTemplateDatabase { databaseStatement ->
            applyTicketTemplateMigrationsUntilV56(databaseStatement)
            applyMigration(databaseStatement, "V13__printer_config.sql")
            applyMigration(databaseStatement, "V58__ticket_template_ticket_type.sql")
            databaseStatement.execute("INSERT INTO ticket_templates (id, name, is_default) VALUES (X'01', 'alice', 1)")

            assertFailsWith<SQLException> {
                databaseStatement.execute("INSERT INTO ticket_templates (id, name, is_default) VALUES (X'02', 'bob', 1)")
            }
            assertFailsWith<SQLException> {
                databaseStatement.execute("INSERT INTO ticket_templates (id, name, ticket_type) VALUES (X'03', 'eve', 'UNKNOWN')")
            }
        }
    }

    private fun applyTicketTemplateMigrationsUntilV56(databaseStatement: Statement) {
        listOf(
            "V11__ticket_template.sql",
            "V14__ticket_template_qrcode.sql",
            "V53__ticket_template_total_row.sql",
            "V54__ticket_template_date_time_formats.sql",
            "V55__ticket_template_logo.sql",
            "V56__ticket_template_payment_method.sql",
        ).forEach { migrationFileName -> applyMigration(databaseStatement, migrationFileName) }
    }

    private fun storedTemplates(databaseStatement: Statement): List<String> =
        databaseStatement.executeQuery("SELECT name, ticket_type, is_default FROM ticket_templates ORDER BY name").use { queryRows ->
            buildList {
                while (queryRows.next()) {
                    add("${queryRows.getString("name")}|${queryRows.getString("ticket_type")}|${queryRows.getInt("is_default")}")
                }
            }
        }

    private fun withTicketTemplateDatabase(runAssertions: (Statement) -> Unit) {
        val databasePath = Files.createTempFile("ambrosia-ticket-template-test", ".db")
        try {
            DriverManager.getConnection("jdbc:sqlite:$databasePath").use { databaseConnection ->
                databaseConnection.createStatement().use(runAssertions)
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

    private fun insertElementSql(
        elementId: String,
        elementType: String,
    ): String =
        "INSERT INTO ticket_template_elements (id, template_id, element_order, type, value) " +
            "VALUES (X'$elementId', X'01', ${elementId.toInt()}, '$elementType', '')"

    private fun storedElementTypes(databaseStatement: Statement): List<String> =
        databaseStatement.executeQuery("SELECT type FROM ticket_template_elements ORDER BY element_order").use { queryRows ->
            buildList {
                while (queryRows.next()) add(queryRows.getString("type"))
            }
        }
}
