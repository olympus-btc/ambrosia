package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object TimeEntriesTable : SQLiteUUIDTable("time_entries") {
    val projectId = reference("project_id", ProjectsTable)
    val taskId = reference("task_id", TasksTable)
    val entryDate = varchar("entry_date", 20)
    val startTime = varchar("start_time", 20).nullable()
    val endTime = varchar("end_time", 20).nullable()
    val description = text("description").nullable()
    val durationMinutes = integer("duration_minutes")
    val isBillable = bool("is_billable").default(true)
    val invoiceId = optReference("invoice_id", InvoicesTable)
    val isLocked = bool("is_locked").default(false)
    val createdAt = varchar("created_at", 50)

    init {
        index(false, projectId, entryDate)
        index(false, invoiceId)
    }
}

class TimeEntryEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<TimeEntryEntity>(TimeEntriesTable)

    var projectId by TimeEntriesTable.projectId
    var taskId by TimeEntriesTable.taskId
    var entryDate by TimeEntriesTable.entryDate
    var startTime by TimeEntriesTable.startTime
    var endTime by TimeEntriesTable.endTime
    var description by TimeEntriesTable.description
    var durationMinutes by TimeEntriesTable.durationMinutes
    var isBillable by TimeEntriesTable.isBillable
    var invoiceId by TimeEntriesTable.invoiceId
    var isLocked by TimeEntriesTable.isLocked
    var createdAt by TimeEntriesTable.createdAt
}
