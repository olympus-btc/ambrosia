package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.Justification
import pos.ambrosia.models.TicketElement
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTemplateRequest
import pos.ambrosia.utils.executeInTransaction
import pos.ambrosia.utils.toBytes
import pos.ambrosia.utils.toUUID
import java.sql.Connection
import java.sql.ResultSet
import java.util.UUID

open class TicketTemplateService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_TEMPLATE = "INSERT INTO ticket_templates (id, name) VALUES (?, ?)"
        private const val GET_TEMPLATES = "SELECT id, name FROM ticket_templates"
        private const val GET_TEMPLATE_BY_ID = "SELECT id, name FROM ticket_templates WHERE id = ?"
        private const val GET_TEMPLATE_BY_NAME = "SELECT id, name FROM ticket_templates WHERE name = ?"
        private const val UPDATE_TEMPLATE = "UPDATE ticket_templates SET name = ? WHERE id = ?"
        private const val DELETE_TEMPLATE = "DELETE FROM ticket_templates WHERE id = ?"
        private const val CHECK_TEMPLATE_NAME_EXISTS = "SELECT id FROM ticket_templates WHERE name = ?"
        private const val CHECK_TEMPLATE_NAME_EXISTS_EXCLUDING_ID = "SELECT id FROM ticket_templates WHERE name = ? AND id != ?"

        private const val ADD_ELEMENT = """
            INSERT INTO ticket_template_elements
            (id, template_id, element_order, type, value, style_bold, style_justification, style_font_size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        private const val GET_ELEMENTS_BY_TEMPLATE_ID = """
            SELECT * FROM ticket_template_elements WHERE template_id = ? ORDER BY element_order ASC
        """
        private const val DELETE_ELEMENTS_BY_TEMPLATE_ID = "DELETE FROM ticket_template_elements WHERE template_id = ?"
    }

    private fun templateNameExists(name: String): Boolean {
        connection.prepareStatement(CHECK_TEMPLATE_NAME_EXISTS).use { statement ->
            statement.setString(1, name)
            val resultSet = statement.executeQuery()
            return resultSet.next()
        }
    }

    private fun templateNameExistsExcludingId(
        name: String,
        excludeId: UUID,
    ): Boolean {
        connection.prepareStatement(CHECK_TEMPLATE_NAME_EXISTS_EXCLUDING_ID).use { statement ->
            statement.setString(1, name)
            statement.setBytes(2, excludeId.toBytes())
            val resultSet = statement.executeQuery()
            return resultSet.next()
        }
    }

    private fun insertElements(
        templateId: UUID,
        elements: List<pos.ambrosia.models.TicketElementCreateRequest>,
    ) {
        elements.forEachIndexed { index, elementRequest ->
            connection.prepareStatement(ADD_ELEMENT).use { statement ->
                statement.setBytes(1, UUID.randomUUID().toBytes())
                statement.setBytes(2, templateId.toBytes())
                statement.setInt(3, index)
                statement.setString(4, elementRequest.type.name)
                statement.setString(5, elementRequest.value)
                statement.setBoolean(6, elementRequest.style?.bold ?: false)
                statement.setString(7, (elementRequest.style?.justification ?: Justification.LEFT).name)
                statement.setString(8, (elementRequest.style?.fontSize ?: FontSize.NORMAL).name)
                statement.executeUpdate()
            }
        }
    }

    suspend fun addTemplate(request: TicketTemplateRequest): String? {
        if (templateNameExists(request.name)) {
            logger.error("Template name already exists: ${request.name}")
            return null
        }

        val templateId = UUID.randomUUID()
        return executeInTransaction(connection) {
            connection.prepareStatement(ADD_TEMPLATE).use { statement ->
                statement.setBytes(1, templateId.toBytes())
                statement.setString(2, request.name)
                statement.executeUpdate()
            }

            insertElements(templateId, request.elements)

            logger.info("Template created successfully with ID: $templateId")
            templateId.toString()
        }
    }

    suspend fun getTemplates(): List<TicketTemplate> {
        connection.createStatement().use { statement ->
            val resultSet = statement.executeQuery(GET_TEMPLATES)
            val templates = mutableListOf<TicketTemplate>()
            while (resultSet.next()) {
                templates.add(mapTemplate(resultSet))
            }
            logger.info("Retrieved ${templates.size} templates")
            return templates
        }
    }

    suspend fun getTemplateById(id: String): TicketTemplate? {
        try {
            val uuid = UUID.fromString(id)
            connection.prepareStatement(GET_TEMPLATE_BY_ID).use { statement ->
                statement.setBytes(1, uuid.toBytes())
                val resultSet = statement.executeQuery()
                return if (resultSet.next()) {
                    mapTemplate(resultSet)
                } else {
                    logger.warn("Template not found with ID: $id")
                    null
                }
            }
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid UUID format for template ID: $id")
            return null
        }
    }

    open suspend fun getTemplateByName(name: String): TicketTemplate? {
        connection.prepareStatement(GET_TEMPLATE_BY_NAME).use { statement ->
            statement.setString(1, name)
            val resultSet = statement.executeQuery()
            return if (resultSet.next()) {
                mapTemplate(resultSet)
            } else {
                logger.warn("Template not found with name: $name")
                null
            }
        }
    }

    suspend fun updateTemplate(
        id: String,
        request: TicketTemplateRequest,
    ): Boolean {
        val templateId =
            try {
                UUID.fromString(id)
            } catch (e: IllegalArgumentException) {
                logger.error("Invalid UUID format for template ID: $id")
                return false
            }

        if (templateNameExistsExcludingId(request.name, templateId)) {
            logger.error("Template name already exists: ${request.name}")
            return false
        }

        return executeInTransaction(connection) {
            connection.prepareStatement(UPDATE_TEMPLATE).use { statement ->
                statement.setString(1, request.name)
                statement.setBytes(2, templateId.toBytes())
                statement.executeUpdate()
            }

            connection.prepareStatement(DELETE_ELEMENTS_BY_TEMPLATE_ID).use { statement ->
                statement.setBytes(1, templateId.toBytes())
                statement.executeUpdate()
            }

            insertElements(templateId, request.elements)

            logger.info("Template updated successfully: $id")
            true
        } ?: false
    }

    suspend fun deleteTemplate(id: String): Boolean {
        val templateId =
            try {
                UUID.fromString(id)
            } catch (e: IllegalArgumentException) {
                logger.error("Invalid UUID format for template ID: $id")
                return false
            }

        connection.prepareStatement(DELETE_TEMPLATE).use { statement ->
            statement.setBytes(1, templateId.toBytes())
            val rowsDeleted = statement.executeUpdate()
            return if (rowsDeleted > 0) {
                logger.info("Template deleted successfully: $id")
                true
            } else {
                logger.warn("Failed to delete template, not found with ID: $id")
                false
            }
        }
    }

    private fun getElementsForTemplate(templateIdBytes: ByteArray): List<TicketElement> {
        connection.prepareStatement(GET_ELEMENTS_BY_TEMPLATE_ID).use { statement ->
            statement.setBytes(1, templateIdBytes)
            val resultSet = statement.executeQuery()
            val elements = mutableListOf<TicketElement>()
            while (resultSet.next()) {
                elements.add(mapElement(resultSet))
            }
            return elements
        }
    }

    private fun mapTemplate(resultSet: ResultSet): TicketTemplate {
        val idBytes = resultSet.getBytes("id")
        return TicketTemplate(
            id = idBytes.toUUID().toString(),
            name = resultSet.getString("name"),
            elements = getElementsForTemplate(idBytes),
        )
    }

    private fun mapElement(resultSet: ResultSet): TicketElement =
        TicketElement(
            id = resultSet.getBytes("id").toUUID().toString(),
            templateId = resultSet.getBytes("template_id").toUUID().toString(),
            order = resultSet.getInt("element_order"),
            type = ElementType.valueOf(resultSet.getString("type")),
            value = resultSet.getString("value"),
            style =
                ElementStyle(
                    bold = resultSet.getBoolean("style_bold"),
                    justification = Justification.valueOf(resultSet.getString("style_justification")),
                    fontSize = FontSize.valueOf(resultSet.getString("style_font_size")),
                ),
        )
}
