package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrderProductsTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.ProductEntity
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

class CheckoutService {
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

    suspend fun getStoreOrders(status: String? = null): List<StoreOrder> =
        transaction {
            val baseCondition = (OrdersTable.isDeleted eq false) and OrdersTable.tableId.isNull()
            val condition = if (status != null) baseCondition and (OrdersTable.status eq status) else baseCondition
            OrderEntity
                .find { condition }
                .orderBy(OrdersTable.createdAt to SortOrder.DESC)
                .map { toStoreOrder(it) }
        }

    suspend fun getStoreOrderById(id: String): StoreOrder? =
        transaction {
            OrderEntity
                .findById(UUID.fromString(id))
                ?.takeIf { !it.isDeleted && it.tableId == null }
                ?.let { toStoreOrder(it) }
        }

    suspend fun cancelStoreOrder(id: String): Boolean =
        transaction {
            val entity = OrderEntity.findById(UUID.fromString(id))
            if (entity == null || entity.status != "open" || entity.tableId != null) {
                false
            } else {
                entity.status = "closed"
                logger.info("Store order cancelled: $id")
                true
            }
        }

    suspend fun findCheckoutByPaymentHash(paymentHash: String): Map<String, String>? =
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

    suspend fun checkout(request: StoreCheckoutRequest): StoreCheckoutResponse? {
        if (request.items.isEmpty()) return null
        if (request.items.any { it.quantity <= 0 }) return null

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
                    OrderProductsTable.insert {
                        it[orderId] = order.id
                        it[productId] = EntityID(UUID.fromString(item.productId), ProductsTable)
                        it[quantity] = item.quantity
                        it[priceAtOrder] = item.priceAtOrder
                    }

                    val product = ProductEntity.findById(UUID.fromString(item.productId))
                    if (product == null || product.isDeleted || product.quantity < item.quantity) {
                        throw InsufficientStockException()
                    }
                    product.quantity -= item.quantity
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
        } catch (exception: InsufficientStockException) {
            null
        }
    }
}
