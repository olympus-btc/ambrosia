package pos.ambrosia.services

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.core.minus
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrderProductsTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.StoreCheckoutResponse
import pos.ambrosia.models.StoreOrder
import pos.ambrosia.models.StoreOrderItem
import java.time.LocalDateTime
import java.util.UUID

private class InsufficientStockException : Exception()

sealed interface CheckoutResult {
    data class Success(
        val response: StoreCheckoutResponse,
        val alreadyExisted: Boolean,
    ) : CheckoutResult

    data object NotPaid : CheckoutResult

    data object Invalid : CheckoutResult
}

class CheckoutService(
    private val paymentVerifier: PaymentVerifier? = null,
) {
    companion object {
        private val checkoutMutex = Mutex()
    }

    private fun toStoreOrder(entity: OrderEntity): StoreOrder {
        val items =
            OrderProductsTable
                .selectAll()
                .where { OrderProductsTable.orderId eq entity.id }
                .map {
                    StoreOrderItem(
                        productId = it[OrderProductsTable.productId].value.toString(),
                        quantity = it[OrderProductsTable.quantity],
                        priceAtOrder = it[OrderProductsTable.priceAtOrder],
                    )
                }
        return StoreOrder(
            id = entity.id.value.toString(),
            userId = entity.userId.value.toString(),
            userName = UserEntity.findById(entity.userId)?.name,
            status = entity.status,
            total = entity.total.toInt(),
            createdAt = entity.createdAt.replace(" ", "T"),
            items = items,
        )
    }

    fun getStoreOrders(status: String? = null): List<StoreOrder> =
        transaction {
            val baseCondition = (OrdersTable.isDeleted eq false) and OrdersTable.tableId.isNull()
            val condition = if (status != null) baseCondition and (OrdersTable.status eq status) else baseCondition
            OrderEntity
                .find { condition }
                .orderBy(OrdersTable.createdAt to SortOrder.DESC)
                .map { toStoreOrder(it) }
        }

    fun getStoreOrderById(id: String): StoreOrder? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            OrderEntity
                .findById(uuid)
                ?.takeIf { !it.isDeleted && it.tableId == null }
                ?.let { toStoreOrder(it) }
        }

    fun cancelStoreOrder(id: String): Boolean =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val entity = OrderEntity.findById(uuid)
            if (entity == null || entity.status != "open" || entity.tableId != null) {
                false
            } else {
                entity.status = "closed"
                logger.info("Store order cancelled: $id")
                true
            }
        }

    fun findCheckoutByPaymentHash(paymentHash: String): Map<String, String>? =
        transaction {
            val payment = PaymentEntity.find { PaymentsTable.paymentHash eq paymentHash }.firstOrNull() ?: return@transaction null
            val ticketPayment =
                TicketPaymentsTable
                    .selectAll()
                    .where { TicketPaymentsTable.paymentId eq payment.id }
                    .firstOrNull() ?: return@transaction null
            val ticket = TicketEntity.findById(ticketPayment[TicketPaymentsTable.ticketId]) ?: return@transaction null
            mapOf(
                "status" to "completed",
                "paymentId" to payment.id.value.toString(),
                "ticketId" to ticket.id.value.toString(),
                "orderId" to ticket.orderId.value.toString(),
            )
        }

    suspend fun checkout(request: StoreCheckoutRequest): CheckoutResult {
        if (request.items.isEmpty()) return CheckoutResult.Invalid
        if (request.items.any { it.quantity <= 0 }) return CheckoutResult.Invalid

        return checkoutMutex.withLock {
            val paymentHash = request.paymentHash
            if (!paymentHash.isNullOrBlank()) {
                findCheckoutByPaymentHash(paymentHash)?.let { existing ->
                    return@withLock CheckoutResult.Success(
                        StoreCheckoutResponse(
                            orderId = existing.getValue("orderId"),
                            ticketId = existing.getValue("ticketId"),
                            paymentId = existing.getValue("paymentId"),
                        ),
                        alreadyExisted = true,
                    )
                }

                val incomingPayment =
                    paymentVerifier?.let { verifier ->
                        runCatching { verifier.getIncomingPayment(paymentHash) }.getOrNull()
                    }
                if (incomingPayment?.isPaid != true) {
                    return@withLock CheckoutResult.NotPaid
                }
            }

            val response = performCheckout(request)
            if (response != null) {
                CheckoutResult.Success(response, alreadyExisted = false)
            } else {
                CheckoutResult.Invalid
            }
        }
    }

    private fun performCheckout(request: StoreCheckoutRequest): StoreCheckoutResponse? {
        try {
            UUID.fromString(request.userId)
            UUID.fromString(request.paymentMethodId)
            UUID.fromString(request.currencyId)
            request.items.forEach { UUID.fromString(it.productId) }
        } catch (_: IllegalArgumentException) {
            return null
        }

        return try {
            transaction {
                val now = LocalDateTime.now().toString()
                val order =
                    OrderEntity.new(UUID.randomUUID()) {
                        this.userId = EntityID(UUID.fromString(request.userId), UsersTable)
                        this.tableId = null
                        this.status = "paid"
                        this.total = request.amount
                        this.createdAt = now
                    }

                for (item in request.items) {
                    val productEntityId = EntityID(UUID.fromString(item.productId), ProductsTable)
                    val updated =
                        ProductsTable.update({
                            (ProductsTable.id eq productEntityId) and
                                (ProductsTable.isDeleted eq false) and
                                (ProductsTable.quantity greaterEq item.quantity)
                        }) {
                            it[ProductsTable.quantity] = ProductsTable.quantity - item.quantity
                        }
                    if (updated == 0) throw InsufficientStockException()

                    OrderProductsTable.insert {
                        it[orderId] = order.id
                        it[productId] = productEntityId
                        it[quantity] = item.quantity
                        it[priceAtOrder] = item.priceAtOrder
                    }
                }

                val ticket =
                    TicketEntity.new(UUID.randomUUID()) {
                        this.orderId = order.id
                        this.userId = EntityID(UUID.fromString(request.userId), UsersTable)
                        this.ticketDate = now
                        this.totalAmount = request.amount
                        this.notes = request.ticketNotes
                    }

                val payment =
                    PaymentEntity.new(UUID.randomUUID()) {
                        this.methodId = EntityID(UUID.fromString(request.paymentMethodId), PaymentMethodsTable)
                        this.currencyId = EntityID(UUID.fromString(request.currencyId), CurrencyTable)
                        this.transactionId = request.transactionId ?: ""
                        this.amount = request.amount
                        this.date = now
                        this.satoshiAmount = request.satoshiAmount
                        this.exchangeRateAtPayment = request.exchangeRateAtPayment
                        this.paymentHash = request.paymentHash
                        this.exchangeRateCurrency = request.exchangeRateCurrency
                        this.fiatAmountAtPayment = request.fiatAmountAtPayment
                    }

                TicketPaymentsTable.insert {
                    it[paymentId] = payment.id
                    it[ticketId] = ticket.id
                }

                logger.info("Store checkout: order=${order.id.value} ticket=${ticket.id.value} payment=${payment.id.value}")
                StoreCheckoutResponse(order.id.value.toString(), ticket.id.value.toString(), payment.id.value.toString())
            }
        } catch (_: InsufficientStockException) {
            null
        }
    }
}
