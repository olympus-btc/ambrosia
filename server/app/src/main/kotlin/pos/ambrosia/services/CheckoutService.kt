package pos.ambrosia.services

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
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
import pos.ambrosia.db.tables.ProductBundleComponentsTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductVariantsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.StoreCheckoutResponse
import java.time.LocalDateTime
import java.util.UUID

private class CheckoutRejectedException(
    val code: String,
    override val message: String,
) : Exception(message)

sealed interface CheckoutResult {
    data class Success(
        val response: StoreCheckoutResponse,
        val alreadyExisted: Boolean,
    ) : CheckoutResult

    data object NotPaid : CheckoutResult

    data class Invalid(
        val code: String,
        val message: String,
    ) : CheckoutResult
}

class CheckoutService(
    private val paymentVerifier: PaymentVerifier? = null,
) {
    companion object {
        private val checkoutMutex = Mutex()
    }

    private val configService = ConfigService()

    private fun firstActiveVariantId(productEntityId: EntityID<UUID>): UUID? =
        ProductVariantsTable
            .selectAll()
            .where {
                (ProductVariantsTable.productId eq productEntityId) and
                    (ProductVariantsTable.isActive eq true)
            }.firstOrNull()
            ?.get(ProductVariantsTable.id)
            ?.value

    private fun isActiveVariant(
        productEntityId: EntityID<UUID>,
        variantId: UUID,
    ): Boolean =
        ProductVariantsTable
            .selectAll()
            .where {
                (ProductVariantsTable.id eq EntityID(variantId, ProductVariantsTable)) and
                    (ProductVariantsTable.productId eq productEntityId) and
                    (ProductVariantsTable.isActive eq true)
            }.any()

    private fun decrementVariantStock(
        productEntityId: EntityID<UUID>,
        variantId: UUID,
        quantity: Int,
    ): Boolean {
        val variantEntityId = EntityID(variantId, ProductVariantsTable)
        val stockRowsUpdated =
            ProductVariantsTable.update({
                (ProductVariantsTable.id eq variantEntityId) and
                    (ProductVariantsTable.productId eq productEntityId) and
                    (ProductVariantsTable.isActive eq true) and
                    (ProductVariantsTable.quantity greaterEq quantity)
            }) {
                it[ProductVariantsTable.quantity] = ProductVariantsTable.quantity - quantity
            }
        return stockRowsUpdated > 0
    }

    private fun decrementProductStock(
        productEntityId: EntityID<UUID>,
        quantity: Int,
    ): Boolean {
        var remainingQuantity = quantity
        val activeVariantRows =
            ProductVariantsTable
                .selectAll()
                .where {
                    (ProductVariantsTable.productId eq productEntityId) and
                        (ProductVariantsTable.isActive eq true) and
                        (ProductVariantsTable.quantity greaterEq 1)
                }.toList()

        for (variantRow in activeVariantRows) {
            if (remainingQuantity == 0) return true
            val availableQuantity = variantRow[ProductVariantsTable.quantity]
            val quantityToDeduct = minOf(availableQuantity, remainingQuantity)
            val stockWasDeducted =
                decrementVariantStock(
                    productEntityId = productEntityId,
                    variantId = variantRow[ProductVariantsTable.id].value,
                    quantity = quantityToDeduct,
                )
            if (!stockWasDeducted) return false
            remainingQuantity -= quantityToDeduct
        }

        return remainingQuantity == 0
    }

    private fun decrementBundleStock(
        bundleEntityId: EntityID<UUID>,
        orderedQuantity: Int,
    ): Boolean {
        val bundleComponents =
            ProductBundleComponentsTable
                .selectAll()
                .where { ProductBundleComponentsTable.bundleId eq bundleEntityId }
                .toList()
        if (bundleComponents.isEmpty()) return false

        return bundleComponents.all { component ->
            val componentProductId = component[ProductBundleComponentsTable.componentId]
            val componentVariantId = component[ProductBundleComponentsTable.componentVariantId]?.value
            val deductQuantity = component[ProductBundleComponentsTable.quantity] * orderedQuantity
            val componentTracksStock = ProductEntity.findById(componentProductId)?.trackStock ?: true
            when {
                !componentTracksStock -> true
                componentVariantId != null -> decrementVariantStock(componentProductId, componentVariantId, deductQuantity)
                else -> decrementProductStock(componentProductId, deductQuantity)
            }
        }
    }

    private fun deductOrderLineStock(
        productEntity: ProductEntity,
        variantId: UUID?,
        quantity: Int,
    ): Boolean {
        if (!productEntity.trackStock) return true
        if (productEntity.isBundle) return decrementBundleStock(productEntity.id, quantity)
        if (variantId != null) return decrementVariantStock(productEntity.id, variantId, quantity)
        return decrementProductStock(productEntity.id, quantity)
    }

    fun cancelStoreOrder(id: String): Boolean =
        transaction {
            val orderUuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val orderEntity = OrderEntity.findById(orderUuid) ?: return@transaction false
            if (orderEntity.status != "open" || orderEntity.tableId != null) return@transaction false
            orderEntity.status = "closed"
            logger.info("Store order cancelled: $id")
            true
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
        if (request.items.isEmpty()) {
            return CheckoutResult.Invalid("checkout_empty", "Checkout requires at least one item")
        }
        if (request.items.any { it.quantity <= 0 }) {
            return CheckoutResult.Invalid("checkout_invalid_quantity", "Checkout item quantities must be positive")
        }

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

            when (val result = performCheckout(request)) {
                is CheckoutResult.Invalid -> result
                is CheckoutResult.Success -> result
                CheckoutResult.NotPaid -> error("performCheckout cannot return NotPaid")
            }
        }
    }

    private fun hasValidIds(request: StoreCheckoutRequest): Boolean =
        try {
            UUID.fromString(request.userId)
            UUID.fromString(request.paymentMethodId)
            UUID.fromString(request.currencyId)
            request.items.forEach { UUID.fromString(it.productId) }
            request.items.mapNotNull { it.variantId }.forEach { UUID.fromString(it) }
            true
        } catch (_: IllegalArgumentException) {
            false
        }

    private fun insertOrderLines(
        order: OrderEntity,
        items: List<StoreCheckoutItem>,
    ) {
        for (item in items) {
            val productEntityId = EntityID(UUID.fromString(item.productId), ProductsTable)
            val productEntity =
                ProductEntity.findById(productEntityId)
                    ?: throw CheckoutRejectedException("checkout_product_not_found", "Checkout product not found")
            val itemVariantId = item.variantId?.let { UUID.fromString(it) }
            if (itemVariantId != null && !isActiveVariant(productEntityId, itemVariantId)) {
                throw CheckoutRejectedException("checkout_variant_not_found", "Checkout product variant not found")
            }
            val orderVariantId =
                itemVariantId ?: firstActiveVariantId(productEntityId)
                    ?: throw CheckoutRejectedException("checkout_variant_not_found", "Checkout product variant not found")

            if (!deductOrderLineStock(productEntity, itemVariantId, item.quantity)) {
                throw CheckoutRejectedException("checkout_insufficient_stock", "Insufficient stock for checkout")
            }

            OrderProductsTable.insert {
                it[orderId] = order.id
                it[OrderProductsTable.productId] = productEntityId
                it[variantId] = orderVariantId.toString()
                it[quantity] = item.quantity
                it[priceAtOrder] = item.priceAtOrder
            }
        }
    }

    private fun createTicketAndPayment(
        order: OrderEntity,
        userEntityId: EntityID<UUID>,
        request: StoreCheckoutRequest,
        now: String,
    ): Pair<TicketEntity, PaymentEntity> {
        val ticket =
            TicketEntity.new(UUID.randomUUID()) {
                this.orderId = order.id
                this.userId = userEntityId
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

        return ticket to payment
    }

    private fun performCheckout(request: StoreCheckoutRequest): CheckoutResult {
        if (!hasValidIds(request)) {
            return CheckoutResult.Invalid("checkout_invalid_reference", "Checkout contains an invalid reference")
        }

        return try {
            transaction {
                val now = LocalDateTime.now(configService.getConfiguredZoneId()).toString()
                val userEntityId = EntityID(UUID.fromString(request.userId), UsersTable)
                val order =
                    OrderEntity.new(UUID.randomUUID()) {
                        this.userId = userEntityId
                        this.tableId = null
                        this.status = "paid"
                        this.total = request.amount
                        this.discountAmount = request.discountAmount
                        this.createdAt = now
                    }

                insertOrderLines(order, request.items)
                val (ticket, payment) = createTicketAndPayment(order, userEntityId, request, now)

                logger.info("Store checkout: order=${order.id.value} ticket=${ticket.id.value} payment=${payment.id.value}")
                CheckoutResult.Success(
                    StoreCheckoutResponse(order.id.value.toString(), ticket.id.value.toString(), payment.id.value.toString()),
                    alreadyExisted = false,
                )
            }
        } catch (rejection: CheckoutRejectedException) {
            CheckoutResult.Invalid(rejection.code, rejection.message)
        }
    }
}
