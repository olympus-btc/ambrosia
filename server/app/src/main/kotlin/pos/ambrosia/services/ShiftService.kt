package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ShiftEntity
import pos.ambrosia.db.tables.ShiftsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Shift
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.UUID

class ShiftService {
    private fun toModel(entity: ShiftEntity): Shift =
        Shift(
            id = entity.id.value.toString(),
            userId = entity.userId.value.toString(),
            shiftDate = entity.shiftDate,
            startTime = entity.startTime,
            endTime = entity.endTime,
            notes = entity.notes ?: "",
            initialAmount = entity.initialAmount ?: 0.0,
            finalAmount = entity.finalAmount,
            difference = entity.difference,
        )

    private fun userExists(userId: String): Boolean {
        val entity = UserEntity.findById(UUID.fromString(userId))
        return entity != null && !entity.isDeleted
    }

    fun addShift(shift: Shift): String? =
        transaction {
            val existingOpen = findOpenShift(null)
            if (existingOpen != null) {
                logger.warn("Attempt to open a new shift while one is already open: ${existingOpen.id}")
                return@transaction null
            }
            if (!userExists(shift.userId)) {
                logger.error("User does not exist: ${shift.userId}")
                return@transaction null
            }

            val id =
                ShiftEntity
                    .new(UUID.randomUUID()) {
                        this.userId = EntityID(UUID.fromString(shift.userId), UsersTable)
                        this.shiftDate = shift.shiftDate
                        this.startTime = shift.startTime
                        this.endTime = shift.endTime
                        this.notes = shift.notes
                        this.initialAmount = shift.initialAmount
                    }.id.value
                    .toString()
            logger.info("Shift created successfully with ID: $id")
            id
        }

    fun getShifts(): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find { ShiftsTable.isDeleted eq false }
                    .map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts")
            shifts
        }

    fun getShiftById(id: String): Shift? =
        transaction {
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) {
                logger.warn("Shift not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getShiftsByUser(userId: String): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find {
                        (ShiftsTable.userId eq EntityID(UUID.fromString(userId), UsersTable)) and (ShiftsTable.isDeleted eq false)
                    }.map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts for user: $userId")
            shifts
        }

    fun getShiftsByDate(date: String): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find { (ShiftsTable.shiftDate eq date) and (ShiftsTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts for date: $date")
            shifts
        }

    private fun findOpenShift(userId: String?): Shift? {
        var query =
            ShiftEntity.find {
                (ShiftsTable.endTime eq null) and (ShiftsTable.isDeleted eq false)
            }
        if (userId != null) {
            query =
                ShiftEntity.find {
                    (ShiftsTable.userId eq EntityID(UUID.fromString(userId), UsersTable)) and
                        (ShiftsTable.endTime eq null) and
                        (ShiftsTable.isDeleted eq false)
                }
        }
        return query
            .orderBy(ShiftsTable.shiftDate to SortOrder.DESC, ShiftsTable.startTime to SortOrder.DESC)
            .limit(1)
            .firstOrNull()
            ?.let { toModel(it) }
    }

    fun getOpenShift(userId: String? = null): Shift? = transaction { findOpenShift(userId) }

    fun updateShift(shift: Shift): Boolean =
        transaction {
            if (shift.id == null) {
                logger.error("Cannot update shift: ID is null")
                return@transaction false
            }

            if (!userExists(shift.userId)) {
                logger.error("User does not exist: ${shift.userId}")
                return@transaction false
            }

            val entity = ShiftEntity.findById(UUID.fromString(shift.id))
            if (entity == null) {
                logger.error("Failed to update shift: ${shift.id}")
                false
            } else {
                entity.userId = EntityID(UUID.fromString(shift.userId), UsersTable)
                entity.shiftDate = shift.shiftDate
                entity.startTime = shift.startTime
                entity.endTime = shift.endTime
                entity.notes = shift.notes
                logger.info("Shift updated successfully: ${shift.id}")
                true
            }
        }

    fun deleteShift(id: String): Boolean =
        transaction {
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete shift: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Shift soft-deleted successfully: $id")
                true
            }
        }

    fun closeShift(
        id: String,
        finalAmount: Double? = null,
        difference: Double? = null,
    ): Boolean =
        transaction {
            val now = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted || entity.endTime != null) {
                logger.warn("Shift not closed (not found or already closed): $id")
                false
            } else {
                entity.endTime = now
                entity.finalAmount = finalAmount
                entity.difference = difference
                logger.info("Shift closed successfully: $id at $now")
                true
            }
        }
}
