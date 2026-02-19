package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.TicketPayment
import java.sql.Connection

class TicketPaymentService(
    private val connection: Connection,
) {
    companion object {
        // Ticket payment queries
        private const val ADD_TICKET_PAYMENT =
            "INSERT INTO ticket_payments (payment_id, ticket_id) VALUES (?, ?)"
        private const val GET_TICKET_PAYMENTS_BY_TICKET =
            "SELECT payment_id, ticket_id FROM ticket_payments WHERE ticket_id = ?"
        private const val GET_TICKET_PAYMENTS_BY_PAYMENT =
            "SELECT payment_id, ticket_id FROM ticket_payments WHERE payment_id = ?"
        private const val DELETE_TICKET_PAYMENT =
            "DELETE FROM ticket_payments WHERE payment_id = ? AND ticket_id = ?"
        private const val DELETE_TICKET_PAYMENTS_BY_TICKET =
            "DELETE FROM ticket_payments WHERE ticket_id = ?"
        private const val CHECK_TICKET_EXISTS = "SELECT id FROM tickets WHERE id = ?"
        private const val CHECK_PAYMENT_EXISTS = "SELECT id FROM payments WHERE id = ?"
    }

    private fun ticketExists(ticketId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_TICKET_EXISTS)
        statement.setString(1, ticketId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun paymentExists(paymentId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_PAYMENT_EXISTS)
        statement.setString(1, paymentId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    suspend fun addTicketPayment(ticketPayment: pos.ambrosia.models.TicketPayment): Boolean {
        // Validar que los IDs no estén vacíos
        if (ticketPayment.payment_id.isBlank() || ticketPayment.ticket_id.isBlank()) {
            logger.error("Payment ID and ticket ID are required fields")
            return false
        }

        // Verificar que el ticket exista
        if (!ticketExists(ticketPayment.ticket_id)) {
            logger.error("Ticket ID does not exist: ${ticketPayment.ticket_id}")
            return false
        }

        // Verificar que el payment exista
        if (!paymentExists(ticketPayment.payment_id)) {
            logger.error("Payment ID does not exist: ${ticketPayment.payment_id}")
            return false
        }

        val statement = connection.prepareStatement(ADD_TICKET_PAYMENT)
        statement.setString(1, ticketPayment.payment_id)
        statement.setString(2, ticketPayment.ticket_id)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info(
                "Ticket payment created successfully: payment ${ticketPayment.payment_id} -> ticket ${ticketPayment.ticket_id}",
            )
            true
        } else {
            logger.error("Failed to create ticket payment")
            false
        }
    }

    suspend fun getTicketPaymentsByTicket(ticketId: String): List<pos.ambrosia.models.TicketPayment> {
        val statement = connection.prepareStatement(GET_TICKET_PAYMENTS_BY_TICKET)
        statement.setString(1, ticketId)
        val resultSet = statement.executeQuery()
        val ticketPayments = mutableListOf<pos.ambrosia.models.TicketPayment>()

        while (resultSet.next()) {
            val ticketPayment =
                pos.ambrosia.models.TicketPayment(
                    payment_id = resultSet.getString("payment_id"),
                    ticket_id = resultSet.getString("ticket_id"),
                )
            ticketPayments.add(ticketPayment)
        }

        logger.info("Retrieved ${ticketPayments.size} payments for ticket: $ticketId")
        return ticketPayments
    }

    suspend fun getTicketPaymentsByPayment(paymentId: String): List<pos.ambrosia.models.TicketPayment> {
        val statement = connection.prepareStatement(GET_TICKET_PAYMENTS_BY_PAYMENT)
        statement.setString(1, paymentId)
        val resultSet = statement.executeQuery()
        val ticketPayments = mutableListOf<pos.ambrosia.models.TicketPayment>()

        while (resultSet.next()) {
            val ticketPayment =
                pos.ambrosia.models.TicketPayment(
                    payment_id = resultSet.getString("payment_id"),
                    ticket_id = resultSet.getString("ticket_id"),
                )
            ticketPayments.add(ticketPayment)
        }

        logger.info("Retrieved ${ticketPayments.size} tickets for payment: $paymentId")
        return ticketPayments
    }

    suspend fun deleteTicketPayment(
        paymentId: String,
        ticketId: String,
    ): Boolean {
        val statement = connection.prepareStatement(DELETE_TICKET_PAYMENT)
        statement.setString(1, paymentId)
        statement.setString(2, ticketId)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Ticket payment deleted successfully: payment $paymentId -> ticket $ticketId")
        } else {
            logger.error("Failed to delete ticket payment: payment $paymentId -> ticket $ticketId")
        }
        return rowsDeleted > 0
    }

    suspend fun deleteTicketPaymentsByTicket(ticketId: String): Boolean {
        val statement = connection.prepareStatement(DELETE_TICKET_PAYMENTS_BY_TICKET)
        statement.setString(1, ticketId)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("All payments deleted for ticket: $ticketId ($rowsDeleted payments)")
        } else {
            logger.info("No payments found to delete for ticket: $ticketId")
        }
        return true
    }
}
