package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Ticket
import java.time.LocalDateTime
import java.util.UUID

class TicketService {
    private fun toModel(entity: TicketEntity): Ticket =
        Ticket(
            id = entity.id.value.toString(),
            orderId = entity.orderId.value.toString(),
            userId = entity.userId.value.toString(),
            ticketDate = entity.ticketDate,
            status = entity.status,
            totalAmount = entity.totalAmount,
            notes = entity.notes ?: "",
        )

    private fun orderExists(orderId: String): Boolean {
        val entity = OrderEntity.findById(UUID.fromString(orderId))
        return entity != null && !entity.isDeleted
    }

    private fun userExists(userId: String): Boolean {
        val entity = UserEntity.findById(UUID.fromString(userId))
        return entity != null && !entity.isDeleted
    }

    private fun isValidStatus(status: Int): Boolean = status in 0..1

    private fun validateTicket(ticket: Ticket): String? {
        if (!orderExists(ticket.orderId)) {
            return "Order does not exist: ${ticket.orderId}"
        }
        if (!userExists(ticket.userId)) {
            return "User does not exist: ${ticket.userId}"
        }
        if (!isValidStatus(ticket.status)) {
            return "Invalid ticket status: ${ticket.status}"
        }
        return null
    }

    fun addTicket(ticket: Ticket): String? =
        transaction {
            val validationError = validateTicket(ticket)
            if (validationError != null) {
                logger.error(validationError)
                return@transaction null
            }

            val ticketDate = ticket.ticketDate.ifEmpty { LocalDateTime.now().toString() }
            val id =
                TicketEntity
                    .new(UUID.randomUUID()) {
                        this.orderId = EntityID(UUID.fromString(ticket.orderId), OrdersTable)
                        this.userId = EntityID(UUID.fromString(ticket.userId), UsersTable)
                        this.ticketDate = ticketDate
                        this.status = ticket.status
                        this.totalAmount = ticket.totalAmount
                        this.notes = ticket.notes
                    }.id.value
                    .toString()
            logger.info("Ticket created successfully with ID: $id")
            id
        }

    fun getTickets(): List<Ticket> =
        transaction {
            val tickets = TicketEntity.all().map { toModel(it) }
            logger.info("Retrieved ${tickets.size} tickets")
            tickets
        }

    fun getTicketById(id: String): Ticket? =
        transaction {
            val entity = TicketEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.warn("Ticket not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getTicketsByOrder(orderId: String): List<Ticket> =
        transaction {
            val tickets =
                TicketEntity
                    .find { TicketsTable.orderId eq EntityID(UUID.fromString(orderId), OrdersTable) }
                    .map { toModel(it) }
            logger.info("Retrieved ${tickets.size} tickets for order: $orderId")
            tickets
        }

    fun getTicketsByUser(userId: String): List<Ticket> =
        transaction {
            val tickets =
                TicketEntity
                    .find { TicketsTable.userId eq EntityID(UUID.fromString(userId), UsersTable) }
                    .map { toModel(it) }
            logger.info("Retrieved ${tickets.size} tickets for user: $userId")
            tickets
        }

    fun updateTicket(ticket: Ticket): Boolean =
        transaction {
            if (ticket.id == null) {
                logger.error("Cannot update ticket: ID is null")
                return@transaction false
            }

            val validationError = validateTicket(ticket)
            if (validationError != null) {
                logger.error(validationError)
                return@transaction false
            }

            val entity = TicketEntity.findById(UUID.fromString(ticket.id))
            if (entity == null) {
                logger.error("Failed to update ticket: ${ticket.id}")
                false
            } else {
                entity.orderId = EntityID(UUID.fromString(ticket.orderId), OrdersTable)
                entity.userId = EntityID(UUID.fromString(ticket.userId), UsersTable)
                entity.ticketDate = ticket.ticketDate
                entity.status = ticket.status
                entity.totalAmount = ticket.totalAmount
                entity.notes = ticket.notes
                logger.info("Ticket updated successfully: ${ticket.id}")
                true
            }
        }

    fun deleteTicket(id: String): Boolean =
        transaction {
            val entity = TicketEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete ticket: $id")
                false
            } else {
                entity.delete()
                logger.info("Ticket deleted successfully: $id")
                true
            }
        }
}
