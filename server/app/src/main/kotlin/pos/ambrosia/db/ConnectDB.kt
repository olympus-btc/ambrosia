package pos.ambrosia.db

import pos.ambrosia.datadir
import io.ktor.server.application.*
import java.sql.Connection
import java.sql.DriverManager
import java.sql.SQLException
import kotlinx.io.files.Path
import pos.ambrosia.logger

object DatabaseConnection {
  @Volatile private var instance: Connection? = null

  fun getConnection(): Connection {
    return instance ?: synchronized(this) { instance ?: createConnection().also { instance = it } }
  }

  private fun createConnection(): Connection {
    // load the SQLite datapath from the config file
    val DBPath = Path(datadir, "ambrosia.db").toString()
    return try {
      DriverManager.getConnection("jdbc:sqlite:$DBPath")
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
