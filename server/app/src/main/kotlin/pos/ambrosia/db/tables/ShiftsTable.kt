package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object ShiftsTable : SQLiteUUIDTable("shifts") {
    val userId = reference("user_id", UsersTable)
    val shiftDate = varchar("shift_date", 20)
    val startTime = varchar("start_time", 20)
    val endTime = varchar("end_time", 20).nullable()
    val notes = varchar("notes", 255).nullable()
    val isDeleted = bool("is_deleted").default(false)
    val initialAmount = double("initial_amount").nullable().default(0.0)
    val finalAmount = double("final_amount").nullable()
    val difference = double("difference").nullable()
}

class ShiftEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ShiftEntity>(ShiftsTable)

    var userId by ShiftsTable.userId
    var shiftDate by ShiftsTable.shiftDate
    var startTime by ShiftsTable.startTime
    var endTime by ShiftsTable.endTime
    var notes by ShiftsTable.notes
    var isDeleted by ShiftsTable.isDeleted
    var initialAmount by ShiftsTable.initialAmount
    var finalAmount by ShiftsTable.finalAmount
    var difference by ShiftsTable.difference
}
