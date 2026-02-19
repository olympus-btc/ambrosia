package pos.ambrosia.db

import kotlinx.io.files.Path
import pos.ambrosia.datadir
import pos.ambrosia.logger
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException

object DatabaseConnection {
    @Volatile private var instance: Connection? = null

    fun getConnection(): Connection = instance ?: synchronized(this) { instance ?: createConnection().also { instance = it } }

    private fun createConnection(): Connection {
        // load the SQLite datapath from the config file
        val dbPath = Path(datadir, "ambrosia.db").toString()
        return try {
            DriverManager.getConnection("jdbc:sqlite:$dbPath")
        } catch (e: SQLException) {
            logger.error("Error connecting to SQLite database: ${e.message}")
            logger.error("Shutting down the application use ./install.sh to install the application")
            System.exit(1) // Exit the program with a non-zero status
            throw IllegalStateException("This code should not be reached") // To satisfy the compiler
        }
    }

    fun closeConnection() {
        synchronized(this) {
            instance?.let {
                if (!it.isClosed) {
                    it.close()
                }
                instance = null
            }
        }
    }
}
