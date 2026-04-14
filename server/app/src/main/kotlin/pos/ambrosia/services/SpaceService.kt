package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Space
import java.sql.Connection

class SpaceService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_SPACE = "INSERT INTO spaces (id, name) VALUES (?, ?)"
        private const val GET_SPACES = "SELECT id, name FROM spaces WHERE is_deleted = 0"
        private const val GET_SPACE_BY_ID =
            "SELECT id, name FROM spaces WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_SPACE = "UPDATE spaces SET name = ? WHERE id = ?"
        private const val DELETE_SPACE = "UPDATE spaces SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_SPACE_NAME_EXISTS =
            "SELECT id FROM spaces WHERE name = ? AND is_deleted = 0"
        private const val CHECK_SPACE_IN_USE =
            "SELECT COUNT(*) as count FROM tables WHERE space_id = ? AND is_deleted = 0"
    }

    private fun spaceNameExists(spaceName: String): Boolean {
        val statement = connection.prepareStatement(CHECK_SPACE_NAME_EXISTS)
        statement.setString(1, spaceName)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun spaceNameExistsExcludingId(
        spaceName: String,
        excludeId: String,
    ): Boolean {
        val statement =
            connection.prepareStatement(
                "SELECT id FROM spaces WHERE name = ? AND id != ? AND is_deleted = 0",
            )
        statement.setString(1, spaceName)
        statement.setString(2, excludeId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun spaceInUse(spaceId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_SPACE_IN_USE)
        statement.setString(1, spaceId)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            return resultSet.getInt("count") > 0
        }
        return false
    }

    suspend fun addSpace(space: Space): String? {
        // Verificar que el nombre del espacio no exista ya
        if (spaceNameExists(space.name)) {
            logger.error("Space name already exists: ${space.name}")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_SPACE)

        statement.setString(1, generatedId)
        statement.setString(2, space.name)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Space created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create space")
            null
        }
    }

    suspend fun getSpaces(): List<Space> {
        val statement = connection.prepareStatement(GET_SPACES)
        val resultSet = statement.executeQuery()
        val spaces = mutableListOf<Space>()
        while (resultSet.next()) {
            val space = Space(id = resultSet.getString("id"), name = resultSet.getString("name"))
            spaces.add(space)
        }
        logger.info("Retrieved ${spaces.size} spaces")
        return spaces
    }

    suspend fun getSpaceById(id: String): Space? {
        val statement = connection.prepareStatement(GET_SPACE_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Space(id = resultSet.getString("id"), name = resultSet.getString("name"))
        } else {
            logger.warn("Space not found with ID: $id")
            null
        }
    }

    suspend fun updateSpace(space: Space): Boolean {
        if (space.id == null) {
            logger.error("Cannot update space: ID is null")
            return false
        }

        // Verificar que el nombre del espacio no exista ya (excluyendo el espacio actual)
        if (spaceNameExistsExcludingId(space.name, space.id)) {
            logger.error("Space name already exists: ${space.name}")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_SPACE)
        statement.setString(1, space.name)
        statement.setString(2, space.id) // CORREGIDO: era setString(3, ...)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Space updated successfully: ${space.id}")
        } else {
            logger.error("Failed to update space: ${space.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteSpace(id: String): Boolean {
        // Verificar que el espacio no esté siendo usado por mesas
        if (spaceInUse(id)) {
            logger.error("Cannot delete space $id: it has tables associated")
            return false
        }

        val statement = connection.prepareStatement(DELETE_SPACE)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Space soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete space: $id")
        }
        return rowsDeleted > 0
    }
}
