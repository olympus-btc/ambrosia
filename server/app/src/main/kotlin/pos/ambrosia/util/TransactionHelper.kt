package pos.ambrosia.util

import pos.ambrosia.logger
import java.sql.Connection

inline fun <T> executeInTransaction(
    connection: Connection,
    block: () -> T,
): T? {
    connection.autoCommit = false
    return try {
        val result = block()
        connection.commit()
        result
    } catch (e: Exception) {
        connection.rollback()
        logger.error("Transaction failed: ${e.message}")
        null
    } finally {
        connection.autoCommit = true
    }
}
