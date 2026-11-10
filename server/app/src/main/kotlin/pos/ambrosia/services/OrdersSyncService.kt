package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.isNotNull
import org.jetbrains.exposed.v1.core.less
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.models.MisdatedOrder
import pos.ambrosia.models.PaymentWithoutOrder
import pos.ambrosia.utils.InvoiceDescriptionParser
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZonedDateTime
import java.util.UUID

class OrdersSyncService(
    private val incomingPaymentHistory: IncomingPaymentHistory,
    private val checkoutService: CheckoutService,
) {
    companion object {
        private const val MISDATED_ORDER_DRIFT_THRESHOLD_MILLIS = 5 * 60 * 1000L
    }

    private val configService = ConfigService()

    private fun resolveDateRange(
        startDate: String,
        endDate: String,
    ): Pair<ZonedDateTime, ZonedDateTime> {
        val zoneId = configService.getConfiguredZoneId()
        val dateRangeStart = LocalDate.parse(startDate).atStartOfDay(zoneId)
        val dateRangeEnd = LocalDate.parse(endDate).plusDays(1).atStartOfDay(zoneId)
        return dateRangeStart to dateRangeEnd
    }

    suspend fun findPaymentsWithoutOrder(
        startDate: String,
        endDate: String,
    ): List<PaymentWithoutOrder> {
        val (dateRangeStart, dateRangeEnd) = resolveDateRange(startDate, endDate)
        val incomingPayments =
            incomingPaymentHistory.listIncomingPayments(
                from = dateRangeStart.toInstant().toEpochMilli(),
                to = dateRangeEnd.toInstant().toEpochMilli(),
                limit = 20,
                offset = 0,
                all = true,
                externalId = null,
            )

        return incomingPayments
            .filter { it.isPaid }
            .filter { checkoutService.findCheckoutByPaymentHash(it.paymentHash) == null }
            .mapNotNull { incomingPaymentWithoutOrder ->
                val completedAt = incomingPaymentWithoutOrder.completedAt ?: return@mapNotNull null
                PaymentWithoutOrder(
                    paymentHash = incomingPaymentWithoutOrder.paymentHash,
                    receivedSat = incomingPaymentWithoutOrder.receivedSat,
                    feeSat = incomingPaymentWithoutOrder.fees / 1000,
                    completedAt = completedAt,
                    purchasedItems = InvoiceDescriptionParser.parsePurchasedItems(incomingPaymentWithoutOrder.description),
                )
            }
    }

    suspend fun findMisdatedOrders(
        startDate: String,
        endDate: String,
    ): List<MisdatedOrder> {
        val (dateRangeStart, dateRangeEnd) = resolveDateRange(startDate, endDate)
        val recordedDateRangeStart = dateRangeStart.toLocalDateTime().toString()
        val recordedDateRangeEnd = dateRangeEnd.toLocalDateTime().toString()

        val paymentHashesWithRecordedDate =
            transaction {
                PaymentsTable
                    .selectAll()
                    .where {
                        PaymentsTable.paymentHash.isNotNull() and
                            (PaymentsTable.date greaterEq recordedDateRangeStart) and
                            (PaymentsTable.date less recordedDateRangeEnd)
                    }.map { it[PaymentsTable.paymentHash]!! to it[PaymentsTable.date] }
            }

        return paymentHashesWithRecordedDate.mapNotNull { (paymentHash, recordedDate) ->
            buildMisdatedOrder(paymentHash, recordedDate)
        }
    }

    private suspend fun buildMisdatedOrder(
        paymentHash: String,
        recordedDate: String,
    ): MisdatedOrder? {
        val checkoutRecord = checkoutService.findCheckoutByPaymentHash(paymentHash) ?: return null
        val actualIncomingPayment = runCatching { incomingPaymentHistory.getIncomingPayment(paymentHash) }.getOrNull() ?: return null
        val actualCompletedAt = actualIncomingPayment.completedAt ?: return null

        val recordedInstantMillis =
            LocalDateTime
                .parse(recordedDate)
                .atZone(configService.getConfiguredZoneId())
                .toInstant()
                .toEpochMilli()
        if (Math.abs(actualCompletedAt - recordedInstantMillis) <= MISDATED_ORDER_DRIFT_THRESHOLD_MILLIS) return null

        return MisdatedOrder(
            paymentId = checkoutRecord.getValue("paymentId"),
            orderId = checkoutRecord.getValue("orderId"),
            paymentHash = paymentHash,
            recordedDate = recordedDate,
            actualCompletedAt = actualCompletedAt,
        )
    }

    suspend fun correctMisdatedOrder(paymentId: String): Boolean {
        val paymentUuid = runCatching { UUID.fromString(paymentId) }.getOrNull() ?: return false
        val paymentHash = transaction { PaymentEntity.findById(paymentUuid)?.paymentHash } ?: return false

        val actualIncomingPayment = runCatching { incomingPaymentHistory.getIncomingPayment(paymentHash) }.getOrNull() ?: return false
        val actualCompletedAt = actualIncomingPayment.completedAt ?: return false
        val correctedDateTime =
            Instant
                .ofEpochMilli(actualCompletedAt)
                .atZone(configService.getConfiguredZoneId())
                .toLocalDateTime()
                .toString()

        return transaction {
            val payment = PaymentEntity.findById(paymentUuid) ?: return@transaction false
            val ticketPayment =
                TicketPaymentsTable
                    .selectAll()
                    .where { TicketPaymentsTable.paymentId eq payment.id }
                    .firstOrNull() ?: return@transaction false
            val ticket = TicketEntity.findById(ticketPayment[TicketPaymentsTable.ticketId]) ?: return@transaction false
            val order = OrderEntity.findById(ticket.orderId) ?: return@transaction false

            payment.date = correctedDateTime
            ticket.ticketDate = correctedDateTime
            order.createdAt = correctedDateTime
            true
        }
    }
}
