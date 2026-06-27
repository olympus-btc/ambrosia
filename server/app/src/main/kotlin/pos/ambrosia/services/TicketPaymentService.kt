package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.logger
import pos.ambrosia.models.TicketPayment
import java.util.UUID

class TicketPaymentService {
    private fun ticketExists(ticketId: String): Boolean = TicketEntity.findById(UUID.fromString(ticketId)) != null

    private fun paymentExists(paymentId: String): Boolean = PaymentEntity.findById(UUID.fromString(paymentId)) != null

    fun addTicketPayment(ticketPayment: TicketPayment): Boolean =
        transaction {
            if (ticketPayment.paymentId.isBlank() || ticketPayment.ticketId.isBlank()) {
                logger.error("Payment ID and ticket ID are required fields")
                return@transaction false
            }

            if (!ticketExists(ticketPayment.ticketId)) {
                logger.error("Ticket ID does not exist: ${ticketPayment.ticketId}")
                return@transaction false
            }

            if (!paymentExists(ticketPayment.paymentId)) {
                logger.error("Payment ID does not exist: ${ticketPayment.paymentId}")
                return@transaction false
            }

            TicketPaymentsTable.insert {
                it[paymentId] = EntityID(UUID.fromString(ticketPayment.paymentId), PaymentsTable)
                it[ticketId] = EntityID(UUID.fromString(ticketPayment.ticketId), TicketsTable)
            }
            logger.info(
                "Ticket payment created successfully: payment ${ticketPayment.paymentId} -> ticket ${ticketPayment.ticketId}",
            )
            true
        }

    fun getTicketPaymentsByTicket(ticketId: String): List<TicketPayment>? =
        transaction {
            if (!ticketExists(ticketId)) return@transaction null

            val ticketPayments =
                TicketPaymentsTable
                    .selectAll()
                    .where { TicketPaymentsTable.ticketId eq EntityID(UUID.fromString(ticketId), TicketsTable) }
                    .map {
                        TicketPayment(
                            paymentId = it[TicketPaymentsTable.paymentId].value.toString(),
                            ticketId = it[TicketPaymentsTable.ticketId].value.toString(),
                        )
                    }
            logger.info("Retrieved ${ticketPayments.size} payments for ticket: $ticketId")
            ticketPayments
        }

    fun getTicketPaymentsByPayment(paymentId: String): List<TicketPayment>? =
        transaction {
            if (!paymentExists(paymentId)) return@transaction null

            val ticketPayments =
                TicketPaymentsTable
                    .selectAll()
                    .where { TicketPaymentsTable.paymentId eq EntityID(UUID.fromString(paymentId), PaymentsTable) }
                    .map {
                        TicketPayment(
                            paymentId = it[TicketPaymentsTable.paymentId].value.toString(),
                            ticketId = it[TicketPaymentsTable.ticketId].value.toString(),
                        )
                    }
            logger.info("Retrieved ${ticketPayments.size} tickets for payment: $paymentId")
            ticketPayments
        }

    fun deleteTicketPayment(
        paymentId: String,
        ticketId: String,
    ): Boolean =
        transaction {
            val rowsDeleted =
                TicketPaymentsTable.deleteWhere {
                    (TicketPaymentsTable.paymentId eq EntityID(UUID.fromString(paymentId), PaymentsTable)) and
                        (TicketPaymentsTable.ticketId eq EntityID(UUID.fromString(ticketId), TicketsTable))
                }

            if (rowsDeleted > 0) {
                logger.info("Ticket payment deleted successfully: payment $paymentId -> ticket $ticketId")
            } else {
                logger.error("Failed to delete ticket payment: payment $paymentId -> ticket $ticketId")
            }
            rowsDeleted > 0
        }

    fun deleteTicketPaymentsByTicket(ticketId: String): Boolean =
        transaction {
            val rowsDeleted =
                TicketPaymentsTable.deleteWhere {
                    TicketPaymentsTable.ticketId eq EntityID(UUID.fromString(ticketId), TicketsTable)
                }

            if (rowsDeleted > 0) {
                logger.info("All payments deleted for ticket: $ticketId ($rowsDeleted payments)")
            } else {
                logger.info("No payments found to delete for ticket: $ticketId")
            }
            true
        }
}
