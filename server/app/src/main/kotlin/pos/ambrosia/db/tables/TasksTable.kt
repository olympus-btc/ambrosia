package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object TasksTable : SQLiteUUIDTable("tasks") {
    val name = varchar("name", 255)
    val isBillable = bool("is_billable").default(true)
    val isDeleted = bool("is_deleted").default(false)
    val createdAt = varchar("created_at", 50)
}

class TaskEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<TaskEntity>(TasksTable)

    var name by TasksTable.name
    var isBillable by TasksTable.isBillable
    var isDeleted by TasksTable.isDeleted
    var createdAt by TasksTable.createdAt
}
