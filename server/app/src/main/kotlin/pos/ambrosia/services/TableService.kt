package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Table
import java.sql.Connection

class TableService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_TABLE =
            "INSERT INTO tables (id, name, space_id, order_id, status) VALUES (?, ?, ?, ?, ?)"
        private const val GET_TABLES =
            "SELECT id, name, space_id, order_id, status FROM tables WHERE is_deleted = 0"
        private const val GET_TABLE_BY_ID =
            "SELECT id, name, space_id, order_id, status FROM tables WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_TABLE =
            "UPDATE tables SET name = ?, space_id = ?, order_id = ?, status = ? WHERE id = ?"
        private const val DELETE_TABLE = "UPDATE tables SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_SPACE_EXISTS = "SELECT id FROM spaces WHERE id = ? AND is_deleted = 0"
        private const val CHECK_TABLE_NAME_EXISTS =
            "SELECT id FROM tables WHERE name = ? AND space_id = ? AND is_deleted = 0"
        private const val CHECK_ORDER_EXISTS = "SELECT id FROM orders WHERE id = ? AND is_deleted = 0"
        private const val GET_TABLES_BY_SPACE =
            "SELECT id, name, space_id, order_id, status FROM tables WHERE space_id = ? AND is_deleted = 0"
    }

    private val validStatuses = setOf("available", "occupied", "reserved")

    private fun spaceExists(spaceId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_SPACE_EXISTS)
        statement.setString(1, spaceId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun orderExists(orderId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_ORDER_EXISTS)
        statement.setString(1, orderId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun tableNameExistsInSpace(
        tableName: String,
        spaceId: String,
    ): Boolean {
        val statement = connection.prepareStatement(CHECK_TABLE_NAME_EXISTS)
        statement.setString(1, tableName)
        statement.setString(2, spaceId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun tableNameExistsInSpaceExcludingId(
        tableName: String,
        spaceId: String,
        excludeId: String,
    ): Boolean {
        val statement =
            connection.prepareStatement(
                "SELECT id FROM tables WHERE name = ? AND space_id = ? AND id != ? AND is_deleted = 0",
            )
        statement.setString(1, tableName)
        statement.setString(2, spaceId)
        statement.setString(3, excludeId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    suspend fun addTable(table: Table): String? {
        // Verificar que el espacio existe
        if (!spaceExists(table.space_id)) {
            logger.error("Space does not exist: ${table.space_id}")
            return null
        }

        // Verificar que el nombre de la mesa no exista ya en el espacio
        if (tableNameExistsInSpace(table.name, table.space_id)) {
            logger.error("Table name already exists in space: ${table.name}")
            return null
        }

        // Validar status
        val tableStatus = table.status ?: "available"
        if (!isValidStatus(tableStatus)) {
            logger.error("Invalid table status: $tableStatus")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_TABLE)

        statement.setString(1, generatedId)
        statement.setString(2, table.name)
        statement.setString(3, table.space_id)
        statement.setString(4, table.order_id)
        statement.setString(5, tableStatus)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Table created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create table")
            null
        }
    }

    suspend fun getTables(): List<Table> {
        val statement = connection.prepareStatement(GET_TABLES)
        val resultSet = statement.executeQuery()
        val tables = mutableListOf<Table>()
        while (resultSet.next()) {
            val table =
                Table(
                    id = resultSet.getString("id"),
                    name = resultSet.getString("name"),
                    space_id = resultSet.getString("space_id"),
                    order_id = resultSet.getString("order_id"),
                    status = resultSet.getString("status"),
                )
            tables.add(table)
        }
        logger.info("Retrieved ${tables.size} tables")
        return tables
    }

    suspend fun getTableById(id: String): Table? {
        val statement = connection.prepareStatement(GET_TABLE_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Table(
                id = resultSet.getString("id"),
                name = resultSet.getString("name"),
                space_id = resultSet.getString("space_id"),
                order_id = resultSet.getString("order_id"),
                status = resultSet.getString("status"),
            )
        } else {
            logger.warn("Table not found with ID: $id")
            null
        }
    }

    suspend fun getTablesBySpace(spaceId: String): List<Table>? {
        if (!spaceExists(spaceId)) return null
        val statement = connection.prepareStatement(GET_TABLES_BY_SPACE)
        statement.setString(1, spaceId)
        val resultSet = statement.executeQuery()
        val tables = mutableListOf<Table>()
        while (resultSet.next()) {
            val table =
                Table(
                    id = resultSet.getString("id"),
                    name = resultSet.getString("name"),
                    space_id = resultSet.getString("space_id"),
                    order_id = resultSet.getString("order_id"),
                    status = resultSet.getString("status"),
                )
            tables.add(table)
        }
        logger.info("Retrieved ${tables.size} tables for space: $spaceId")
        return tables
    }

    suspend fun updateTable(table: Table): Boolean {
        if (table.id == null) {
            logger.error("Cannot update table: ID is null")
            return false
        }

        // Verificar que el espacio existe
        if (!spaceExists(table.space_id)) {
            logger.error("Space does not exist: ${table.space_id}")
            return false
        }

        // Verificar que el nombre de la mesa no exista ya en el espacio (excluyendo la mesa actual)
        if (tableNameExistsInSpaceExcludingId(table.name, table.space_id, table.id)) {
            logger.error("Table name already exists in space: ${table.name}")
            return false
        }

        // Validar status
        val tableStatus = table.status ?: "available"
        if (!isValidStatus(tableStatus)) {
            logger.error("Invalid table status: $tableStatus")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_TABLE)
        statement.setString(1, table.name)
        statement.setString(2, table.space_id)
        statement.setString(3, table.order_id)
        statement.setString(4, tableStatus)
        statement.setString(5, table.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Table updated successfully: ${table.id}")
        } else {
            logger.error("Failed to update table: ${table.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteTable(id: String): Boolean {
        val statement = connection.prepareStatement(DELETE_TABLE)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Table soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete table: $id")
        }
        return rowsDeleted > 0
    }
}
