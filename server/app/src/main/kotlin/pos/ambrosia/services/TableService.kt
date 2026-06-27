package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.DiningTableEntity
import pos.ambrosia.db.tables.DiningTablesTable
import pos.ambrosia.db.tables.SpaceEntity
import pos.ambrosia.db.tables.SpacesTable
import pos.ambrosia.logger
import pos.ambrosia.models.Table
import java.util.UUID

class TableService {
    private val validStatuses = setOf("available", "occupied", "reserved")

    private fun toModel(entity: DiningTableEntity): Table =
        Table(
            id = entity.id.value.toString(),
            name = entity.name,
            status = entity.status,
            spaceId = entity.spaceId.value.toString(),
            orderId = entity.orderId,
        )

    private fun spaceExists(spaceId: String): Boolean = SpaceEntity.findById(UUID.fromString(spaceId))?.isDeleted == false

    private fun tableNameExistsInSpace(
        tableName: String,
        spaceId: String,
    ): Boolean =
        !DiningTableEntity
            .find {
                (DiningTablesTable.name eq tableName) and
                    (DiningTablesTable.spaceId eq EntityID(UUID.fromString(spaceId), SpacesTable)) and
                    (DiningTablesTable.isDeleted eq false)
            }.empty()

    private fun tableNameExistsInSpaceExcludingId(
        tableName: String,
        spaceId: String,
        excludeId: String,
    ): Boolean =
        !DiningTableEntity
            .find {
                (DiningTablesTable.name eq tableName) and
                    (DiningTablesTable.spaceId eq EntityID(UUID.fromString(spaceId), SpacesTable)) and
                    (DiningTablesTable.id neq EntityID(UUID.fromString(excludeId), DiningTablesTable)) and
                    (DiningTablesTable.isDeleted eq false)
            }.empty()

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    fun addTable(table: Table): String? =
        transaction {
            if (!spaceExists(table.spaceId)) {
                logger.error("Space does not exist: ${table.spaceId}")
                return@transaction null
            }

            if (tableNameExistsInSpace(table.name, table.spaceId)) {
                logger.error("Table name already exists in space: ${table.name}")
                return@transaction null
            }

            val tableStatus = table.status ?: "available"
            if (!isValidStatus(tableStatus)) {
                logger.error("Invalid table status: $tableStatus")
                return@transaction null
            }

            val id =
                DiningTableEntity
                    .new(UUID.randomUUID()) {
                        this.name = table.name
                        this.spaceId = EntityID(UUID.fromString(table.spaceId), SpacesTable)
                        this.orderId = table.orderId
                        this.status = tableStatus
                    }.id.value
                    .toString()
            logger.info("Table created successfully with ID: $id")
            id
        }

    fun getTables(): List<Table> =
        transaction {
            val tables = DiningTableEntity.find { DiningTablesTable.isDeleted eq false }.map { toModel(it) }
            logger.info("Retrieved ${tables.size} tables")
            tables
        }

    fun getTableById(id: String): Table? =
        transaction {
            val entity = DiningTableEntity.findById(UUID.fromString(id))?.takeIf { !it.isDeleted }
            if (entity == null) {
                logger.warn("Table not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getTablesBySpace(spaceId: String): List<Table>? =
        transaction {
            if (!spaceExists(spaceId)) return@transaction null

            val tables =
                DiningTableEntity
                    .find {
                        (DiningTablesTable.spaceId eq EntityID(UUID.fromString(spaceId), SpacesTable)) and
                            (DiningTablesTable.isDeleted eq false)
                    }.map { toModel(it) }
            logger.info("Retrieved ${tables.size} tables for space: $spaceId")
            tables
        }

    fun updateTable(table: Table): Boolean =
        transaction {
            if (table.id == null) {
                logger.error("Cannot update table: ID is null")
                return@transaction false
            }

            if (!spaceExists(table.spaceId)) {
                logger.error("Space does not exist: ${table.spaceId}")
                return@transaction false
            }

            if (tableNameExistsInSpaceExcludingId(table.name, table.spaceId, table.id)) {
                logger.error("Table name already exists in space: ${table.name}")
                return@transaction false
            }

            val tableStatus = table.status ?: "available"
            if (!isValidStatus(tableStatus)) {
                logger.error("Invalid table status: $tableStatus")
                return@transaction false
            }

            val entity = DiningTableEntity.findById(UUID.fromString(table.id))
            if (entity == null) {
                logger.error("Failed to update table: ${table.id}")
                false
            } else {
                entity.name = table.name
                entity.spaceId = EntityID(UUID.fromString(table.spaceId), SpacesTable)
                entity.orderId = table.orderId
                entity.status = tableStatus
                logger.info("Table updated successfully: ${table.id}")
                true
            }
        }

    fun deleteTable(id: String): Boolean =
        transaction {
            val entity = DiningTableEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete table: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Table soft-deleted successfully: $id")
                true
            }
        }
}
