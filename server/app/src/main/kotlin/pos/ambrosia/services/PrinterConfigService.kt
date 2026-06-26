package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.PrinterConfigEntity
import pos.ambrosia.db.tables.PrinterConfigsTable
import pos.ambrosia.logger
import pos.ambrosia.models.PrinterConfig
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.PrinterType
import java.time.LocalDateTime
import java.util.UUID

enum class PrinterConfigUpdateStatus {
    UPDATED,
    NOT_FOUND,
    CONFLICT,
}

open class PrinterConfigService {
    private fun toModel(entity: PrinterConfigEntity): PrinterConfig =
        PrinterConfig(
            id = entity.id.value.toString(),
            printerType = PrinterType.valueOf(entity.printerType),
            printerName = entity.printerName,
            templateName = entity.templateName,
            isDefault = entity.isDefault,
            enabled = entity.enabled,
            createdAt = entity.createdAt,
        )

    private fun configExists(
        printerType: PrinterType,
        printerName: String,
    ): Boolean =
        !PrinterConfigsTable
            .selectAll()
            .where { (PrinterConfigsTable.printerType eq printerType.name) and (PrinterConfigsTable.printerName eq printerName) }
            .empty()

    private fun configExistsExcludingId(
        printerType: PrinterType,
        printerName: String,
        excludeId: UUID,
    ): Boolean =
        !PrinterConfigsTable
            .selectAll()
            .where {
                (PrinterConfigsTable.printerType eq printerType.name) and
                    (PrinterConfigsTable.printerName eq printerName) and
                    (PrinterConfigsTable.id neq EntityID(excludeId, PrinterConfigsTable))
            }.empty()

    private fun clearDefaultForType(printerType: PrinterType) {
        PrinterConfigsTable.update({
            (PrinterConfigsTable.printerType eq printerType.name) and (PrinterConfigsTable.isDefault eq true)
        }) {
            it[isDefault] = false
        }
    }

    fun createPrinterConfig(request: PrinterConfigCreateRequest): String? =
        transaction {
            if (configExists(request.printerType, request.printerName)) {
                logger.error("Printer config already exists: ${request.printerType} ${request.printerName}")
                return@transaction null
            }

            if (request.isDefault) {
                clearDefaultForType(request.printerType)
            }

            val configId =
                PrinterConfigEntity
                    .new(UUID.randomUUID()) {
                        this.printerType = request.printerType.name
                        this.printerName = request.printerName
                        this.templateName = request.templateName
                        this.isDefault = request.isDefault
                        this.enabled = request.enabled
                        this.createdAt = LocalDateTime.now().toString()
                    }.id.value
                    .toString()

            logger.info("Printer config created: ${request.printerType} ${request.printerName}")
            configId
        }

    fun upsertDefaultByTypeName(
        printerType: PrinterType,
        printerName: String,
    ): String? =
        transaction {
            clearDefaultForType(printerType)

            val existing =
                PrinterConfigEntity
                    .find {
                        (PrinterConfigsTable.printerType eq printerType.name) and (PrinterConfigsTable.printerName eq printerName)
                    }.firstOrNull()

            if (existing != null) {
                existing.isDefault = true
                existing.enabled = true
                existing.id.value.toString()
            } else {
                PrinterConfigEntity
                    .new(UUID.randomUUID()) {
                        this.printerType = printerType.name
                        this.printerName = printerName
                        this.templateName = null
                        this.isDefault = true
                        this.enabled = true
                        this.createdAt = LocalDateTime.now().toString()
                    }.id.value
                    .toString()
            }
        }

    fun getPrinterConfigs(): List<PrinterConfig> =
        transaction {
            PrinterConfigEntity.all().map { toModel(it) }
        }

    fun getPrinterConfigById(id: String): PrinterConfig? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for printer config ID: $id")
                    return@transaction null
                }

            PrinterConfigEntity.findById(uuid)?.let { toModel(it) }
        }

    open fun getDefaultByType(printerType: PrinterType): PrinterConfig? =
        transaction {
            PrinterConfigEntity
                .find {
                    (PrinterConfigsTable.printerType eq printerType.name) and
                        (PrinterConfigsTable.isDefault eq true) and
                        (PrinterConfigsTable.enabled eq true)
                }.firstOrNull()
                ?.let { toModel(it) }
        }

    open fun getEnabledByType(printerType: PrinterType): List<PrinterConfig> =
        transaction {
            PrinterConfigEntity
                .find {
                    (PrinterConfigsTable.printerType eq printerType.name) and (PrinterConfigsTable.enabled eq true)
                }.map { toModel(it) }
        }

    fun updatePrinterConfig(
        id: String,
        request: PrinterConfigUpdateRequest,
    ): PrinterConfigUpdateStatus =
        transaction {
            val configId =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for printer config ID: $id")
                    return@transaction PrinterConfigUpdateStatus.NOT_FOUND
                }

            val entity = PrinterConfigEntity.findById(configId) ?: return@transaction PrinterConfigUpdateStatus.NOT_FOUND

            val newType = request.printerType ?: PrinterType.valueOf(entity.printerType)
            val newName = request.printerName ?: entity.printerName
            val newTemplateName = request.templateName ?: entity.templateName
            val newDefault = request.isDefault ?: entity.isDefault
            val newEnabled = request.enabled ?: entity.enabled

            if (configExistsExcludingId(newType, newName, configId)) {
                logger.error("Printer config already exists: $newType $newName")
                return@transaction PrinterConfigUpdateStatus.CONFLICT
            }

            if (newDefault) {
                clearDefaultForType(newType)
            }

            entity.printerType = newType.name
            entity.printerName = newName
            entity.templateName = newTemplateName
            entity.isDefault = newDefault
            entity.enabled = newEnabled

            PrinterConfigUpdateStatus.UPDATED
        }

    fun deletePrinterConfig(id: String): Boolean =
        transaction {
            val configId =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for printer config ID: $id")
                    return@transaction false
                }

            PrinterConfigsTable.deleteWhere { PrinterConfigsTable.id eq EntityID(configId, PrinterConfigsTable) } > 0
        }

    fun setDefault(id: String): Boolean =
        transaction {
            val configId =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    logger.error("Invalid UUID format for printer config ID: $id")
                    return@transaction false
                }

            val entity = PrinterConfigEntity.findById(configId) ?: return@transaction false
            clearDefaultForType(PrinterType.valueOf(entity.printerType))
            entity.isDefault = true
            true
        }
}
