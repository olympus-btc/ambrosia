package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Ticket
import java.sql.Connection

class TicketService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_TICKET =
            "INSERT INTO tickets (id, order_id, user_id, ticket_date, status, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
        private const val GET_TICKETS =
            "SELECT id, order_id, user_id, ticket_date, status, total_amount, notes FROM tickets"
        private const val GET_TICKET_BY_ID =
            "SELECT id, order_id, user_id, ticket_date, status, total_amount, notes FROM tickets WHERE id = ?"
        private const val UPDATE_TICKET =
            "UPDATE tickets SET order_id = ?, user_id = ?, ticket_date = ?, status = ?, total_amount = ?, notes = ? WHERE id = ?"
        private const val DELETE_TICKET = "DELETE FROM tickets WHERE id = ?"
        private const val CHECK_ORDER_EXISTS = "SELECT id FROM orders WHERE id = ? AND is_deleted = 0"
        private const val CHECK_USER_EXISTS = "SELECT id FROM users WHERE id = ? AND is_deleted = 0"
        private const val GET_TICKETS_BY_ORDER =
            "SELECT id, order_id, user_id, ticket_date, status, total_amount, notes FROM tickets WHERE order_id = ?"
        private const val GET_TICKETS_BY_USER =
            "SELECT id, order_id, user_id, ticket_date, status, total_amount, notes FROM tickets WHERE user_id = ?"
    }

    private fun orderExists(orderId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_ORDER_EXISTS)
        statement.setString(1, orderId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun userExists(userId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_USER_EXISTS)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun isValidStatus(status: Int): Boolean = status in 0..1

    private fun validateTicket(ticket: Ticket): String? {
        if (!orderExists(ticket.order_id)) {
            return "Order does not exist: ${ticket.order_id}"
        }
        if (!userExists(ticket.user_id)) {
            return "User does not exist: ${ticket.user_id}"
        }
        if (!isValidStatus(ticket.status)) {
            return "Invalid ticket status: ${ticket.status}"
        }
        return null
    }

    private fun mapResultSetToTicket(rs: java.sql.ResultSet): Ticket =
        Ticket(
            id = rs.getString("id"),
            order_id = rs.getString("order_id"),
            user_id = rs.getString("user_id"),
            ticket_date = rs.getString("ticket_date"),
            status = rs.getInt("status"),
            total_amount = rs.getDouble("total_amount"),
            notes = rs.getString("notes"),
        )

    suspend fun addTicket(ticket: Ticket): String? {
        val validationError = validateTicket(ticket)
        if (validationError != null) {
            logger.error(validationError)
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_TICKET)

        statement.setString(1, generatedId)
        statement.setString(2, ticket.order_id)
        statement.setString(3, ticket.user_id)
        // Si no se proporciona fecha, usar la actual
        val ticketDate =
            ticket.ticket_date.ifEmpty {
                java.time.LocalDateTime
                    .now()
                    .toString()
            }
        statement.setString(4, ticketDate)
        statement.setInt(5, ticket.status)
        statement.setDouble(6, ticket.total_amount.toDouble())
        statement.setString(7, ticket.notes)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Ticket created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create ticket")
            null
        }
    }

    suspend fun getTickets(): List<Ticket> {
        val statement = connection.prepareStatement(GET_TICKETS)
        val resultSet = statement.executeQuery()
        val tickets = mutableListOf<Ticket>()
        while (resultSet.next()) {
            tickets.add(mapResultSetToTicket(resultSet))
        }
        logger.info("Retrieved ${tickets.size} tickets")
        return tickets
    }

    suspend fun getTicketById(id: String): Ticket? {
        val statement = connection.prepareStatement(GET_TICKET_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            mapResultSetToTicket(resultSet)
        } else {
            logger.warn("Ticket not found with ID: $id")
            null
        }
    }

    suspend fun getTicketsByOrder(orderId: String): List<Ticket> {
        val statement = connection.prepareStatement(GET_TICKETS_BY_ORDER)
        statement.setString(1, orderId)
        val resultSet = statement.executeQuery()
        val tickets = mutableListOf<Ticket>()
        while (resultSet.next()) {
            tickets.add(mapResultSetToTicket(resultSet))
        }
        logger.info("Retrieved ${tickets.size} tickets for order: $orderId")
        return tickets
    }

    suspend fun getTicketsByUser(userId: String): List<Ticket> {
        val statement = connection.prepareStatement(GET_TICKETS_BY_USER)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        val tickets = mutableListOf<Ticket>()
        while (resultSet.next()) {
            tickets.add(mapResultSetToTicket(resultSet))
        }
        logger.info("Retrieved ${tickets.size} tickets for user: $userId")
        return tickets
    }

    suspend fun updateTicket(ticket: Ticket): Boolean {
        if (ticket.id == null) {
            logger.error("Cannot update ticket: ID is null")
            return false
        }

        val validationError = validateTicket(ticket)
        if (validationError != null) {
            logger.error(validationError)
            return false
        }

        val statement = connection.prepareStatement(UPDATE_TICKET)
        statement.setString(1, ticket.order_id)
        statement.setString(2, ticket.user_id)
        statement.setString(3, ticket.ticket_date)
        statement.setInt(4, ticket.status)
        statement.setDouble(5, ticket.total_amount)
        statement.setString(6, ticket.notes)
        statement.setString(7, ticket.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Ticket updated successfully: ${ticket.id}")
        } else {
            logger.error("Failed to update ticket: ${ticket.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteTicket(id: String): Boolean {
        val statement = connection.prepareStatement(DELETE_TICKET)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Ticket deleted successfully: $id")
        } else {
            logger.error("Failed to delete ticket: $id")
        }
        return rowsDeleted > 0
    }
}
