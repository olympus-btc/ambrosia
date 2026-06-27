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
import pos.ambrosia.models.Space
import java.util.UUID

class SpaceService {
    private fun toModel(entity: SpaceEntity): Space = Space(id = entity.id.value.toString(), name = entity.name ?: "")

    private fun spaceNameExists(spaceName: String): Boolean =
        !SpaceEntity.find { (SpacesTable.name eq spaceName) and (SpacesTable.isDeleted eq false) }.empty()

    private fun spaceNameExistsExcludingId(
        spaceName: String,
        excludeId: String,
    ): Boolean =
        !SpaceEntity
            .find {
                (SpacesTable.name eq spaceName) and (SpacesTable.isDeleted eq false) and
                    (SpacesTable.id neq EntityID(UUID.fromString(excludeId), SpacesTable))
            }.empty()

    private fun spaceInUse(spaceId: String): Boolean =
        !DiningTableEntity
            .find {
                (DiningTablesTable.spaceId eq EntityID(UUID.fromString(spaceId), SpacesTable)) and (DiningTablesTable.isDeleted eq false)
            }.empty()

    fun addSpace(space: Space): String? =
        transaction {
            if (spaceNameExists(space.name)) {
                logger.error("Space name already exists: ${space.name}")
                return@transaction null
            }

            val id =
                SpaceEntity
                    .new(UUID.randomUUID()) {
                        this.name = space.name
                    }.id.value
                    .toString()
            logger.info("Space created successfully with ID: $id")
            id
        }

    fun getSpaces(): List<Space> =
        transaction {
            val spaces = SpaceEntity.find { SpacesTable.isDeleted eq false }.map { toModel(it) }
            logger.info("Retrieved ${spaces.size} spaces")
            spaces
        }

    fun getSpaceById(id: String): Space? =
        transaction {
            val entity = SpaceEntity.findById(UUID.fromString(id))?.takeIf { !it.isDeleted }
            if (entity == null) {
                logger.warn("Space not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun updateSpace(space: Space): Boolean =
        transaction {
            if (space.id == null) {
                logger.error("Cannot update space: ID is null")
                return@transaction false
            }

            if (spaceNameExistsExcludingId(space.name, space.id)) {
                logger.error("Space name already exists: ${space.name}")
                return@transaction false
            }

            val entity = SpaceEntity.findById(UUID.fromString(space.id))
            if (entity == null) {
                logger.error("Failed to update space: ${space.id}")
                false
            } else {
                entity.name = space.name
                logger.info("Space updated successfully: ${space.id}")
                true
            }
        }

    fun deleteSpace(id: String): Boolean =
        transaction {
            if (spaceInUse(id)) {
                logger.error("Cannot delete space $id: it has tables associated")
                return@transaction false
            }

            val entity = SpaceEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete space: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Space soft-deleted successfully: $id")
                true
            }
        }
}
