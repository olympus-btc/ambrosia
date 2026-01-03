package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketElement // Corrected import
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.Justification
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.TicketTemplateRequest
import java.sql.Connection
import java.sql.ResultSet
import java.util.UUID

open class TicketTemplateService(private val connection: Connection) {

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
        private const val GET_ELEMENTS_BY_TEMPLATE_ID = "SELECT * FROM ticket_template_elements WHERE template_id = ? ORDER BY element_order ASC"
        private const val DELETE_ELEMENTS_BY_TEMPLATE_ID = "DELETE FROM ticket_template_elements WHERE template_id = ?"
    }

    private fun templateNameExists(name: String): Boolean {
        connection.prepareStatement(CHECK_TEMPLATE_NAME_EXISTS).use { stmt ->
            stmt.setString(1, name)
            val rs = stmt.executeQuery()
            return rs.next()
        }
    }

    private fun templateNameExistsExcludingId(name: String, excludeId: UUID): Boolean {
        connection.prepareStatement(CHECK_TEMPLATE_NAME_EXISTS_EXCLUDING_ID).use { stmt ->
            stmt.setString(1, name)
            stmt.setBytes(2, excludeId.toBytes())
            val rs = stmt.executeQuery()
            return rs.next()
        }
    }

    suspend fun addTemplate(request: TicketTemplateRequest): String? {
        if (templateNameExists(request.name)) {
            logger.error("Template name already exists: ${request.name}")
            return null
        }

        val templateId = UUID.randomUUID()
        connection.autoCommit = false
        try {
            connection.prepareStatement(ADD_TEMPLATE).use { stmt ->
                stmt.setBytes(1, templateId.toBytes())
                stmt.setString(2, request.name)
                stmt.executeUpdate()
            }

            request.elements.forEachIndexed { index, elementRequest ->
                connection.prepareStatement(ADD_ELEMENT).use { stmt ->
                    stmt.setBytes(1, UUID.randomUUID().toBytes())
                    stmt.setBytes(2, templateId.toBytes())
                    stmt.setInt(3, index)
                    stmt.setString(4, elementRequest.type.name)
                    stmt.setString(5, elementRequest.value)
                    stmt.setBoolean(6, elementRequest.style?.bold ?: false)
                    stmt.setString(7, (elementRequest.style?.justification ?: Justification.LEFT).name)
                    stmt.setString(8, (elementRequest.style?.fontSize ?: FontSize.NORMAL).name)
                    stmt.executeUpdate()
                }
            }
            connection.commit()
            logger.info("Template created successfully with ID: $templateId")
            return templateId.toString()
        } catch (e: Exception) {
            connection.rollback()
            logger.error("Failed to create template: ${e.message}")
            return null
        } finally {
            connection.autoCommit = true
        }
    }

    suspend fun getTemplates(): List<TicketTemplate> {
        connection.createStatement().use { stmt ->
            val rs = stmt.executeQuery(GET_TEMPLATES)
            val templates = mutableListOf<TicketTemplate>()
            while (rs.next()) {
                templates.add(mapTemplate(rs))
            }
            logger.info("Retrieved ${templates.size} templates")
            return templates
        }
    }

    suspend fun getTemplateById(id: String): TicketTemplate? {
        try {
            val uuid = UUID.fromString(id)
            connection.prepareStatement(GET_TEMPLATE_BY_ID).use { stmt ->
                stmt.setBytes(1, uuid.toBytes())
                val rs = stmt.executeQuery()
                return if (rs.next()) {
                    mapTemplate(rs)
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
        connection.prepareStatement(GET_TEMPLATE_BY_NAME).use { stmt ->
            stmt.setString(1, name)
            val rs = stmt.executeQuery()
            return if (rs.next()) {
                mapTemplate(rs)
            } else {
                logger.warn("Template not found with name: $name")
                null
            }
        }
    }

    suspend fun updateTemplate(id: String, request: TicketTemplateRequest): Boolean {
        val templateId = try {
            UUID.fromString(id)
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid UUID format for template ID: $id")
            return false
        }
        
        if (templateNameExistsExcludingId(request.name, templateId)) {
            logger.error("Template name already exists: ${request.name}")
            return false
        }

        connection.autoCommit = false
        try {
            connection.prepareStatement(UPDATE_TEMPLATE).use { stmt ->
                stmt.setString(1, request.name)
                stmt.setBytes(2, templateId.toBytes())
                stmt.executeUpdate()
            }

            connection.prepareStatement(DELETE_ELEMENTS_BY_TEMPLATE_ID).use { stmt ->
                stmt.setBytes(1, templateId.toBytes())
                stmt.executeUpdate()
            }

            request.elements.forEachIndexed { index, elementRequest ->
                connection.prepareStatement(ADD_ELEMENT).use { stmt ->
                    stmt.setBytes(1, UUID.randomUUID().toBytes())
                    stmt.setBytes(2, templateId.toBytes())
                    stmt.setInt(3, index)
                    stmt.setString(4, elementRequest.type.name)
                    stmt.setString(5, elementRequest.value)
                    stmt.setBoolean(6, elementRequest.style?.bold ?: false)
                    stmt.setString(7, (elementRequest.style?.justification ?: Justification.LEFT).name)
                    stmt.setString(8, (elementRequest.style?.fontSize ?: FontSize.NORMAL).name)
                    stmt.executeUpdate()
                }
            }
            connection.commit()
            logger.info("Template updated successfully: $id")
            return true
        } catch (e: Exception) {
            connection.rollback()
            logger.error("Failed to update template $id: ${e.message}")
            return false
        } finally {
            connection.autoCommit = true
        }
    }

    suspend fun deleteTemplate(id: String): Boolean {
        val templateId = try {
            UUID.fromString(id)
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid UUID format for template ID: $id")
            return false
        }

        connection.prepareStatement(DELETE_TEMPLATE).use { stmt ->
            stmt.setBytes(1, templateId.toBytes())
            val rowsDeleted = stmt.executeUpdate()
            return if (rowsDeleted > 0) {
                logger.info("Template deleted successfully: $id")
                true
            } else {
                logger.warn("Failed to delete template, not found with ID: $id")
                false
            }
        }
    }

    private fun getElementsForTemplate(templateIdBytes: ByteArray): List<TicketElement> { // Changed to TicketElement
        connection.prepareStatement(GET_ELEMENTS_BY_TEMPLATE_ID).use { stmt ->
            stmt.setBytes(1, templateIdBytes)
            val rs = stmt.executeQuery()
            val elements = mutableListOf<TicketElement>() // Changed to TicketElement
            while (rs.next()) {
                elements.add(mapElement(rs))
            }
            return elements
        }
    }

    private fun mapTemplate(rs: ResultSet): TicketTemplate {
        val idBytes = rs.getBytes("id")
        return TicketTemplate(
            id = idBytes.toUUID().toString(),
            name = rs.getString("name"),
            elements = getElementsForTemplate(idBytes)
        )
    }

    private fun mapElement(rs: ResultSet): TicketElement { // Changed to TicketElement
        return TicketElement( // Changed to TicketElement
            id = rs.getBytes("id").toUUID().toString(),
            templateId = rs.getBytes("template_id").toUUID().toString(),
            order = rs.getInt("element_order"),
            type = ElementType.valueOf(rs.getString("type")),
            value = rs.getString("value"),
            style = ElementStyle(
                bold = rs.getBoolean("style_bold"),
                justification = Justification.valueOf(rs.getString("style_justification")),
                fontSize = FontSize.valueOf(rs.getString("style_font_size"))
            )
        )
    }
}

fun UUID.toBytes(): ByteArray {
    val byteArray = ByteArray(16)
    val bb = java.nio.ByteBuffer.wrap(byteArray)
    bb.putLong(this.mostSignificantBits)
    bb.putLong(this.leastSignificantBits)
    return byteArray
}

fun ByteArray.toUUID(): UUID {
    val bb = java.nio.ByteBuffer.wrap(this)
    val mostSigBits = bb.getLong()
    val leastSigBits = bb.getLong()
    return UUID(mostSigBits, leastSigBits)
}
