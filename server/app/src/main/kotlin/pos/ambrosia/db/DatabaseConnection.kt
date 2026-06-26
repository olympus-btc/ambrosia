package pos.ambrosia.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import kotlinx.io.files.Path
import org.flywaydb.core.Flyway
import org.jetbrains.exposed.v1.jdbc.Database
import pos.ambrosia.datadir
import pos.ambrosia.logger

object DatabaseConnection {
    private lateinit var dataSource: HikariDataSource

    fun init() {
        dataSource = buildDataSource()
        runMigrations(dataSource)
        Database.connect(dataSource)
        logger.info("Database initialized successfully")
    }

    private fun buildDataSource(): HikariDataSource {
        val databasePath = Path(datadir, "ambrosia.db").toString()
        val config =
            HikariConfig().apply {
                jdbcUrl = "jdbc:sqlite:$databasePath"
                driverClassName = "org.sqlite.JDBC"
                maximumPoolSize = 5
                transactionIsolation = "TRANSACTION_SERIALIZABLE"
                addDataSourceProperty("journal_mode", "WAL")
                addDataSourceProperty("foreign_keys", "ON")
                addDataSourceProperty("busy_timeout", "5000")
            }
        return HikariDataSource(config)
    }

    private fun runMigrations(dataSource: HikariDataSource) {
        Flyway
            .configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .mixed(true)
            .load()
            .migrate()
    }

    fun close() {
        if (::dataSource.isInitialized && !dataSource.isClosed) {
            dataSource.close()
            logger.info("Database connection closed")
        }
    }
}
