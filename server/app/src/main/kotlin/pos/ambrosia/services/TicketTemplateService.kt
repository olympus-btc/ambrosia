package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.TicketTemplateElementEntity
import pos.ambrosia.db.tables.TicketTemplateElementsTable
import pos.ambrosia.db.tables.TicketTemplateEntity
import pos.ambrosia.db.tables.TicketTemplatesTable
import pos.ambrosia.logger
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.Justification
import pos.ambrosia.models.TicketElement
import pos.ambrosia.models.TicketElementCreateRequest
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTemplateRequest
import java.util.UUID

open class TicketTemplateService {
    private fun templateNameExists(name: String): Boolean =
        !TicketTemplatesTable.selectAll().where { TicketTemplatesTable.name eq name }.empty()

    private fun templateNameExistsExcludingId(
        name: String,
        excludeId: UUID,
    ): Boolean =
        !TicketTemplatesTable
            .selectAll()
            .where { (TicketTemplatesTable.name eq name) and (TicketTemplatesTable.id neq EntityID(excludeId, TicketTemplatesTable)) }
            .empty()

    private fun insertElements(
        templateId: UUID,
        elements: List<TicketElementCreateRequest>,
    ) {
        elements.forEachIndexed { index, elementRequest ->
            TicketTemplateElementEntity.new(UUID.randomUUID()) {
                this.templateId = EntityID(templateId, TicketTemplatesTable)
                this.elementOrder = index
                this.type = elementRequest.type.name
                this.value = elementRequest.value
                this.styleBold = elementRequest.style?.bold ?: false
                this.styleJustification = (elementRequest.style?.justification ?: Justification.LEFT).name
                this.styleFontSize = (elementRequest.style?.fontSize ?: FontSize.NORMAL).name
            }
        }
    }

    fun addTemplate(request: TicketTemplateRequest): String? =
        transaction {
            if (templateNameExists(request.name)) {
                logger.error("Template name already exists: ${request.name}")
                return@transaction null
            }

            val templateId =
                TicketTemplateEntity
                    .new(UUID.randomUUID()) {
                        this.name = request.name
                    }.id.value

            insertElements(templateId, request.elements)

            logger.info("Template created successfully with ID: $templateId")
            templateId.toString()
        }

    fun getTemplates(): List<TicketTemplate> =
        transaction {
            val templates = TicketTemplateEntity.all().map { toModel(it) }
            logger.info("Retrieved ${templates.size} templates")
            templates
        }

    fun getTemplateById(id: String): TicketTemplate? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for template ID: $id")
                    return@transaction null
                }

            val entity = TicketTemplateEntity.findById(uuid)
            if (entity == null) {
                logger.warn("Template not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    open fun getTemplateByName(name: String): TicketTemplate? =
        transaction {
            val entity = TicketTemplateEntity.find { TicketTemplatesTable.name eq name }.firstOrNull()
            if (entity == null) {
                logger.warn("Template not found with name: $name")
                null
            } else {
                toModel(entity)
            }
        }

    fun updateTemplate(
        id: String,
        request: TicketTemplateRequest,
    ): Boolean =
        transaction {
            val templateId =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for template ID: $id")
                    return@transaction false
                }

            if (templateNameExistsExcludingId(request.name, templateId)) {
                logger.error("Template name already exists: ${request.name}")
                return@transaction false
            }

            val entity = TicketTemplateEntity.findById(templateId) ?: return@transaction false
            entity.name = request.name

            TicketTemplateElementsTable.deleteWhere { TicketTemplateElementsTable.templateId eq EntityID(templateId, TicketTemplatesTable) }
            insertElements(templateId, request.elements)

            logger.info("Template updated successfully: $id")
            true
        }

    fun deleteTemplate(id: String): Boolean =
        transaction {
            val templateId =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for template ID: $id")
                    return@transaction false
                }

            val entity = TicketTemplateEntity.findById(templateId)
            if (entity == null) {
                logger.warn("Failed to delete template, not found with ID: $id")
                false
            } else {
                TicketTemplateElementsTable.deleteWhere {
                    TicketTemplateElementsTable.templateId eq
                        EntityID(templateId, TicketTemplatesTable)
                }
                entity.delete()
                logger.info("Template deleted successfully: $id")
                true
            }
        }

    private fun toModel(entity: TicketTemplateEntity): TicketTemplate =
        TicketTemplate(
            id = entity.id.value.toString(),
            name = entity.name,
            elements =
                TicketTemplateElementEntity
                    .find { TicketTemplateElementsTable.templateId eq entity.id }
                    .sortedBy { it.elementOrder }
                    .map { toElement(it) },
        )

    private fun toElement(entity: TicketTemplateElementEntity): TicketElement =
        TicketElement(
            id = entity.id.value.toString(),
            templateId = entity.templateId.value.toString(),
            order = entity.elementOrder,
            type = ElementType.valueOf(entity.type),
            value = entity.value ?: "",
            style =
                ElementStyle(
                    bold = entity.styleBold,
                    justification = Justification.valueOf(entity.styleJustification),
                    fontSize = FontSize.valueOf(entity.styleFontSize),
                ),
        )
}
