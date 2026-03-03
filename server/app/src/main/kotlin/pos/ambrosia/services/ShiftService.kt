package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Shift
import java.sql.Connection
import java.time.LocalTime
import java.time.format.DateTimeFormatter

class ShiftService(
  private val connection: Connection,
) {
  companion object {
    private const val ADD_SHIFT =
      "INSERT INTO shifts (id, user_id, shift_date, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?, ?)"
    private const val GET_SHIFTS =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE is_deleted = 0"
    private const val GET_SHIFT_BY_ID =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE id = ? AND is_deleted = 0"
    private const val UPDATE_SHIFT =
      "UPDATE shifts SET user_id = ?, shift_date = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ?"
    private const val DELETE_SHIFT = "UPDATE shifts SET is_deleted = 1 WHERE id = ?"
    private const val CHECK_USER_EXISTS = "SELECT id FROM users WHERE id = ? AND is_deleted = 0"
    private const val GET_SHIFTS_BY_USER =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE user_id = ? AND is_deleted = 0"
    private const val GET_SHIFTS_BY_DATE =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE shift_date = ? AND is_deleted = 0"
    private const val GET_OPEN_SHIFT =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE end_time IS NULL AND is_deleted = 0 ORDER BY shift_date DESC, start_time DESC LIMIT 1"
    private const val GET_OPEN_SHIFT_BY_USER =
      "SELECT id, user_id, shift_date, start_time, end_time, notes FROM shifts WHERE user_id = ? AND end_time IS NULL AND is_deleted = 0 ORDER BY shift_date DESC, start_time DESC LIMIT 1"
    private const val CLOSE_SHIFT =
      "UPDATE shifts SET end_time = ? WHERE id = ? AND is_deleted = 0 AND end_time IS NULL"
  }

  private fun userExists(userId: String): Boolean {
    val statement = connection.prepareStatement(CHECK_USER_EXISTS)
    statement.setString(1, userId)
    val resultSet = statement.executeQuery()
    return resultSet.next()
  }

  suspend fun addShift(shift: Shift): String? {
    val existingOpen = getOpenShift(null)
    if (existingOpen != null) {
      logger.warn("Attempt to open a new shift while one is already open: ${existingOpen.id}")
      return null
    }
    if (!userExists(shift.user_id)) {
      logger.error("User does not exist: ${shift.user_id}")
      return null
    }

    val generatedId =
      java.util.UUID
        .randomUUID()
        .toString()
    val statement = connection.prepareStatement(ADD_SHIFT)

    statement.setString(1, generatedId)
    statement.setString(2, shift.user_id)
    statement.setString(3, shift.shift_date)
    statement.setString(4, shift.start_time)
    statement.setString(5, shift.end_time)
    statement.setString(6, shift.notes)

    val rowsAffected = statement.executeUpdate()

    return if (rowsAffected > 0) {
      logger.info("Shift created successfully with ID: $generatedId")
      generatedId
    } else {
      logger.error("Failed to create shift")
      null
    }
  }

  suspend fun getShifts(): List<Shift> {
    val statement = connection.prepareStatement(GET_SHIFTS)
    val resultSet = statement.executeQuery()
    val shifts = mutableListOf<Shift>()
    while (resultSet.next()) {
      val shift =
        Shift(
          id = resultSet.getString("id"),
          user_id = resultSet.getString("user_id"),
          shift_date = resultSet.getString("shift_date"),
          start_time = resultSet.getString("start_time"),
          end_time = resultSet.getString("end_time"),
          notes = resultSet.getString("notes"),
        )
      shifts.add(shift)
    }
    logger.info("Retrieved ${shifts.size} shifts")
    return shifts
  }

  suspend fun getShiftById(id: String): Shift? {
    val statement = connection.prepareStatement(GET_SHIFT_BY_ID)
    statement.setString(1, id)
    val resultSet = statement.executeQuery()
    return if (resultSet.next()) {
      Shift(
        id = resultSet.getString("id"),
        user_id = resultSet.getString("user_id"),
        shift_date = resultSet.getString("shift_date"),
        start_time = resultSet.getString("start_time"),
        end_time = resultSet.getString("end_time"),
        notes = resultSet.getString("notes"),
      )
    } else {
      logger.warn("Shift not found with ID: $id")
      null
    }
  }

  suspend fun getShiftsByUser(userId: String): List<Shift> {
    val statement = connection.prepareStatement(GET_SHIFTS_BY_USER)
    statement.setString(1, userId)
    val resultSet = statement.executeQuery()
    val shifts = mutableListOf<Shift>()
    while (resultSet.next()) {
      val shift =
        Shift(
          id = resultSet.getString("id"),
          user_id = resultSet.getString("user_id"),
          shift_date = resultSet.getString("shift_date"),
          start_time = resultSet.getString("start_time"),
          end_time = resultSet.getString("end_time"),
          notes = resultSet.getString("notes"),
        )
      shifts.add(shift)
    }
    logger.info("Retrieved ${shifts.size} shifts for user: $userId")
    return shifts
  }

  suspend fun getShiftsByDate(date: String): List<Shift> {
    val statement = connection.prepareStatement(GET_SHIFTS_BY_DATE)
    statement.setString(1, date)
    val resultSet = statement.executeQuery()
    val shifts = mutableListOf<Shift>()
    while (resultSet.next()) {
      val shift =
        Shift(
          id = resultSet.getString("id"),
          user_id = resultSet.getString("user_id"),
          shift_date = resultSet.getString("shift_date"),
          start_time = resultSet.getString("start_time"),
          end_time = resultSet.getString("end_time"),
          notes = resultSet.getString("notes"),
        )
      shifts.add(shift)
    }
    logger.info("Retrieved ${shifts.size} shifts for date: $date")
    return shifts
  }

  suspend fun getOpenShift(userId: String? = null): Shift? {
    val statement =
      if (userId != null) {
        val st = connection.prepareStatement(GET_OPEN_SHIFT_BY_USER)
        st.setString(1, userId)
        st
      } else {
        connection.prepareStatement(GET_OPEN_SHIFT)
      }

    val resultSet = statement.executeQuery()
    return if (resultSet.next()) {
      Shift(
        id = resultSet.getString("id"),
        user_id = resultSet.getString("user_id"),
        shift_date = resultSet.getString("shift_date"),
        start_time = resultSet.getString("start_time"),
        end_time = resultSet.getString("end_time"),
        notes = resultSet.getString("notes"),
      )
    } else {
      null
    }
  }

  suspend fun updateShift(shift: Shift): Boolean {
    if (shift.id == null) {
      logger.error("Cannot update shift: ID is null")
      return false
    }

    if (!userExists(shift.user_id)) {
      logger.error("User does not exist: ${shift.user_id}")
      return false
    }

    val statement = connection.prepareStatement(UPDATE_SHIFT)
    statement.setString(1, shift.user_id)
    statement.setString(2, shift.shift_date)
    statement.setString(3, shift.start_time)
    statement.setString(4, shift.end_time)
    statement.setString(5, shift.notes)
    statement.setString(6, shift.id)

    val rowsUpdated = statement.executeUpdate()
    if (rowsUpdated > 0) {
      logger.info("Shift updated successfully: ${shift.id}")
    } else {
      logger.error("Failed to update shift: ${shift.id}")
    }
    return rowsUpdated > 0
  }

  suspend fun deleteShift(id: String): Boolean {
    val statement = connection.prepareStatement(DELETE_SHIFT)
    statement.setString(1, id)
    val rowsDeleted = statement.executeUpdate()

    if (rowsDeleted > 0) {
      logger.info("Shift soft-deleted successfully: $id")
    } else {
      logger.error("Failed to delete shift: $id")
    }
    return rowsDeleted > 0
  }

  suspend fun closeShift(id: String): Boolean {
    val now = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
    val statement = connection.prepareStatement(CLOSE_SHIFT)
    statement.setString(1, now)
    statement.setString(2, id)

    val rows = statement.executeUpdate()
    if (rows > 0) {
      logger.info("Shift closed successfully: $id at $now")
    } else {
      logger.warn("Shift not closed (not found or already closed): $id")
    }
    return rows > 0
  }
}
