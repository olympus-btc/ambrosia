package pos.ambrosia.utest

import org.junit.Test
import java.nio.file.Files
import java.sql.DriverManager
import kotlin.io.path.deleteIfExists
import kotlin.test.assertEquals

class TimeEntryIndexesMigrationTest {
    @Test
    fun `V46 creates both required time entry indexes`() {
        val databasePath = Files.createTempFile("ambrosia-index-test", ".db")
        try {
            DriverManager.getConnection("jdbc:sqlite:$databasePath").use { connection ->
                connection.createStatement().use { statement ->
                    statement.execute(
                        """CREATE TABLE time_entries (
                            id BLOB PRIMARY KEY,
                            project_id BLOB NOT NULL,
                            entry_date TEXT NOT NULL,
                            invoice_id BLOB
                        )""",
                    )
                    val migration =
                        checkNotNull(javaClass.classLoader.getResource("db/migration/V46__add_time_entry_indexes.sql"))
                            .readText()
                    migration
                        .split(';')
                        .map(String::trim)
                        .filter(String::isNotEmpty)
                        .forEach(statement::execute)

                    assertEquals(
                        listOf("project_id", "entry_date"),
                        indexColumns(statement, "idx_time_entries_project_date"),
                    )
                    assertEquals(
                        listOf("invoice_id"),
                        indexColumns(statement, "idx_time_entries_invoice"),
                    )
                }
            }
        } finally {
            databasePath.deleteIfExists()
        }
    }

    private fun indexColumns(
        statement: java.sql.Statement,
        indexName: String,
    ): List<String> =
        statement.executeQuery("PRAGMA index_info('$indexName')").use { resultSet ->
            buildList {
                while (resultSet.next()) add(resultSet.getString("name"))
            }
        }
}
