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
import pos.ambrosia.models.PrintableTicketType
import pos.ambrosia.models.TicketDateFormat
import pos.ambrosia.models.TicketElement
import pos.ambrosia.models.TicketElementCreateRequest
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTemplateRequest
import pos.ambrosia.models.TicketTimeFormat
import java.util.UUID

enum class TemplateDeletionStatus {
    DELETED,
    NOT_FOUND,
    IS_DEFAULT,
}

open class TicketTemplateService {
    private fun templateNameExists(templateName: String): Boolean =
        !TicketTemplatesTable.selectAll().where { TicketTemplatesTable.name eq templateName }.empty()

    private fun templateNameExistsExcludingId(
        templateName: String,
        excludedTemplateUuid: UUID,
    ): Boolean =
        !TicketTemplatesTable
            .selectAll()
            .where {
                (TicketTemplatesTable.name eq templateName) and
                    (TicketTemplatesTable.id neq EntityID(excludedTemplateUuid, TicketTemplatesTable))
            }.empty()

    private fun insertElements(
        templateUuid: UUID,
        elementRequests: List<TicketElementCreateRequest>,
    ) {
        elementRequests.forEachIndexed { elementIndex, elementRequest ->
            TicketTemplateElementEntity.new(UUID.randomUUID()) {
                this.templateId = EntityID(templateUuid, TicketTemplatesTable)
                this.elementOrder = elementIndex
                this.type = elementRequest.type.name
                this.value = elementRequest.value
                this.styleBold = elementRequest.style?.bold ?: false
                this.styleJustification = (elementRequest.style?.justification ?: Justification.LEFT).name
                this.styleFontSize = (elementRequest.style?.fontSize ?: FontSize.NORMAL).name
            }
        }
    }

    fun addTemplate(templateRequest: TicketTemplateRequest): String? =
        transaction {
            if (templateNameExists(templateRequest.name)) {
                logger.error("Template name already exists: ${templateRequest.name}")
                return@transaction null
            }

            val templateUuid =
                TicketTemplateEntity
                    .new(UUID.randomUUID()) {
                        this.name = templateRequest.name
                        this.dateFormat = templateRequest.dateFormat.name
                        this.timeFormat = templateRequest.timeFormat.name
                        this.ticketType = templateRequest.ticketType.name
                        this.isDefault = !hasDefaultTemplate(templateRequest.ticketType)
                    }.id.value

            insertElements(templateUuid, templateRequest.elements)

            logger.info("Template created successfully with ID: $templateUuid")
            templateUuid.toString()
        }

    fun getTemplates(): List<TicketTemplate> =
        transaction {
            val ticketTemplates = TicketTemplateEntity.all().map { ticketTemplateEntity -> toModel(ticketTemplateEntity) }
            logger.info("Retrieved ${ticketTemplates.size} templates")
            ticketTemplates
        }

    fun getTemplateById(templateId: String): TicketTemplate? =
        transaction {
            val templateUuid = parseTemplateId(templateId) ?: return@transaction null
            val ticketTemplateEntity = TicketTemplateEntity.findById(templateUuid)
            if (ticketTemplateEntity == null) {
                logger.warn("Template not found with ID: $templateId")
                null
            } else {
                toModel(ticketTemplateEntity)
            }
        }

    open fun getTemplateByName(templateName: String): TicketTemplate? =
        transaction {
            val ticketTemplateEntity = TicketTemplateEntity.find { TicketTemplatesTable.name eq templateName }.firstOrNull()
            if (ticketTemplateEntity == null) {
                logger.warn("Template not found with name: $templateName")
                null
            } else {
                toModel(ticketTemplateEntity)
            }
        }

    open fun getDefaultTemplate(ticketType: PrintableTicketType): TicketTemplate? =
        transaction {
            val defaultTemplateEntity = findDefaultTemplateEntity(ticketType)
            if (defaultTemplateEntity == null) {
                logger.warn("No default template configured for ticket type: $ticketType")
                null
            } else {
                toModel(defaultTemplateEntity)
            }
        }

    fun setDefaultTemplate(templateId: String): Boolean =
        transaction {
            val templateUuid = parseTemplateId(templateId) ?: return@transaction false
            val newDefaultTemplateEntity = TicketTemplateEntity.findById(templateUuid) ?: return@transaction false
            val ticketType = PrintableTicketType.valueOf(newDefaultTemplateEntity.ticketType)
            findDefaultTemplateEntity(ticketType)
                ?.takeIf { currentDefaultTemplateEntity -> currentDefaultTemplateEntity.id != newDefaultTemplateEntity.id }
                ?.let { currentDefaultTemplateEntity ->
                    currentDefaultTemplateEntity.isDefault = false
                    currentDefaultTemplateEntity.flush()
                }
            newDefaultTemplateEntity.isDefault = true
            logger.info("Template $templateId set as default for ticket type: $ticketType")
            true
        }

    private fun findDefaultTemplateEntity(ticketType: PrintableTicketType): TicketTemplateEntity? =
        TicketTemplateEntity
            .find { (TicketTemplatesTable.ticketType eq ticketType.name) and (TicketTemplatesTable.isDefault eq true) }
            .firstOrNull()

    private fun hasDefaultTemplate(ticketType: PrintableTicketType): Boolean = findDefaultTemplateEntity(ticketType) != null

    private fun parseTemplateId(templateId: String): UUID? =
        try {
            UUID.fromString(templateId)
        } catch (invalidTemplateIdException: IllegalArgumentException) {
            logger.error("Invalid UUID format for template ID: $templateId")
            null
        }

    fun updateTemplate(
        templateId: String,
        templateRequest: TicketTemplateRequest,
    ): Boolean =
        transaction {
            val templateUuid = parseTemplateId(templateId) ?: return@transaction false

            if (templateNameExistsExcludingId(templateRequest.name, templateUuid)) {
                logger.error("Template name already exists: ${templateRequest.name}")
                return@transaction false
            }

            val ticketTemplateEntity = TicketTemplateEntity.findById(templateUuid) ?: return@transaction false
            ticketTemplateEntity.name = templateRequest.name
            ticketTemplateEntity.dateFormat = templateRequest.dateFormat.name
            ticketTemplateEntity.timeFormat = templateRequest.timeFormat.name

            TicketTemplateElementsTable.deleteWhere {
                TicketTemplateElementsTable.templateId eq
                    EntityID(
                        templateUuid,
                        TicketTemplatesTable,
                    )
            }
            insertElements(templateUuid, templateRequest.elements)

            logger.info("Template updated successfully: $templateId")
            true
        }

    fun deleteTemplate(templateId: String): TemplateDeletionStatus =
        transaction {
            val templateUuid = parseTemplateId(templateId) ?: return@transaction TemplateDeletionStatus.NOT_FOUND
            val ticketTemplateEntity = TicketTemplateEntity.findById(templateUuid)
            when {
                ticketTemplateEntity == null -> {
                    logger.warn("Failed to delete template, not found with ID: $templateId")
                    TemplateDeletionStatus.NOT_FOUND
                }

                ticketTemplateEntity.isDefault -> {
                    logger.warn("Refusing to delete the default template of ${ticketTemplateEntity.ticketType}: $templateId")
                    TemplateDeletionStatus.IS_DEFAULT
                }

                else -> {
                    TicketTemplateElementsTable.deleteWhere {
                        TicketTemplateElementsTable.templateId eq
                            EntityID(templateUuid, TicketTemplatesTable)
                    }
                    ticketTemplateEntity.delete()
                    logger.info("Template deleted successfully: $templateId")
                    TemplateDeletionStatus.DELETED
                }
            }
        }

    private fun toModel(ticketTemplateEntity: TicketTemplateEntity): TicketTemplate =
        TicketTemplate(
            id = ticketTemplateEntity.id.value.toString(),
            name = ticketTemplateEntity.name,
            elements =
                TicketTemplateElementEntity
                    .find { TicketTemplateElementsTable.templateId eq ticketTemplateEntity.id }
                    .sortedBy { templateElementEntity -> templateElementEntity.elementOrder }
                    .map { templateElementEntity -> toElement(templateElementEntity) },
            dateFormat = TicketDateFormat.valueOf(ticketTemplateEntity.dateFormat),
            timeFormat = TicketTimeFormat.valueOf(ticketTemplateEntity.timeFormat),
            ticketType = PrintableTicketType.valueOf(ticketTemplateEntity.ticketType),
            isDefault = ticketTemplateEntity.isDefault,
        )

    private fun toElement(templateElementEntity: TicketTemplateElementEntity): TicketElement =
        TicketElement(
            id = templateElementEntity.id.value.toString(),
            templateId = templateElementEntity.templateId.value.toString(),
            order = templateElementEntity.elementOrder,
            type = ElementType.valueOf(templateElementEntity.type),
            value = templateElementEntity.value ?: "",
            style =
                ElementStyle(
                    bold = templateElementEntity.styleBold,
                    justification = Justification.valueOf(templateElementEntity.styleJustification),
                    fontSize = FontSize.valueOf(templateElementEntity.styleFontSize),
                ),
        )
}
