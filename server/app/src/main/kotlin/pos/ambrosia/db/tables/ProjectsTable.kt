package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object ProjectsTable : SQLiteUUIDTable("projects") {
    val clientId = reference("client_id", ClientsTable)
    val name = varchar("name", 255)
    val status = varchar("status", 20).default("pending")
    val hourlyRateCents = integer("hourly_rate_cents").nullable()
    val isBillable = bool("is_billable").default(true)
    val isDeleted = bool("is_deleted").default(false)
    val createdAt = varchar("created_at", 50)
}

class ProjectEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ProjectEntity>(ProjectsTable)

    var clientId by ProjectsTable.clientId
    var name by ProjectsTable.name
    var status by ProjectsTable.status
    var hourlyRateCents by ProjectsTable.hourlyRateCents
    var isBillable by ProjectsTable.isBillable
    var isDeleted by ProjectsTable.isDeleted
    var createdAt by ProjectsTable.createdAt
}
