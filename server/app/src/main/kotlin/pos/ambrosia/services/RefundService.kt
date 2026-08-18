package pos.ambrosia.services

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.plus
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrderProductsTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.ProductBundleComponentsTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductVariantsTable
import pos.ambrosia.db.tables.RefundEntity
import pos.ambrosia.db.tables.RefundsTable
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.logger
import pos.ambrosia.models.RefundRequest
import pos.ambrosia.models.StoreRefund
import pos.ambrosia.models.phoenix.OutgoingPayment
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.utils.Bolt11Decoder
import pos.ambrosia.utils.OrderAlreadyRefundedException
import pos.ambrosia.utils.OrderNotRefundableException
import pos.ambrosia.utils.ResourceNotFoundException
import java.time.LocalDateTime
import java.util.UUID

class RefundService(
    private val lightningBackend: LightningBackend,
) {
    companion object {
        private val refundMutex = Mutex()
    }

    private val configService = ConfigService()

    private fun restoreVariantStock(
        variantId: UUID,
        quantity: Int,
    ) {
        val variantEntityId = EntityID(variantId, ProductVariantsTable)
        ProductVariantsTable.update({ ProductVariantsTable.id eq variantEntityId }) {
            it[ProductVariantsTable.quantity] = ProductVariantsTable.quantity + quantity
        }
    }

    private fun restoreProductStock(
        productEntityId: EntityID<UUID>,
        quantity: Int,
    ) {
        val defaultVariantId =
            ProductVariantsTable
                .selectAll()
                .where { ProductVariantsTable.productId eq productEntityId }
                .firstOrNull()
                ?.get(ProductVariantsTable.id) ?: return
        restoreVariantStock(defaultVariantId.value, quantity)
    }

    private fun restoreBundleStock(
        bundleEntityId: EntityID<UUID>,
        orderedQuantity: Int,
    ) {
        val bundleComponents =
            ProductBundleComponentsTable
                .selectAll()
                .where { ProductBundleComponentsTable.bundleId eq bundleEntityId }
                .toList()
        for (component in bundleComponents) {
            val restoreQuantity = component[ProductBundleComponentsTable.quantity] * orderedQuantity
            val componentVariantId = component[ProductBundleComponentsTable.componentVariantId]?.value
            if (componentVariantId != null) {
                restoreVariantStock(componentVariantId, restoreQuantity)
            } else {
                restoreProductStock(component[ProductBundleComponentsTable.componentId], restoreQuantity)
            }
        }
    }

    private fun restoreOrderLineStock(row: ResultRow) {
        val productEntityId = row[OrderProductsTable.productId]
        val orderedQuantity = row[OrderProductsTable.quantity]
        val productEntity = ProductEntity.findById(productEntityId) ?: return

        if (!productEntity.trackStock) return

        if (productEntity.isBundle) {
            restoreBundleStock(productEntityId, orderedQuantity)
            return
        }

        val variantIdString = row[OrderProductsTable.variantId]
        if (variantIdString != null) {
            restoreVariantStock(UUID.fromString(variantIdString), orderedQuantity)
        } else {
            restoreProductStock(productEntityId, orderedQuantity)
        }
    }

    suspend fun processRefund(
        orderId: String,
        request: RefundRequest,
    ): StoreRefund =
        refundMutex.withLock {
            val orderUuid =
                try {
                    UUID.fromString(orderId)
                } catch (_: IllegalArgumentException) {
                    throw ResourceNotFoundException("Order not found")
                }

            val (order, items, originalSatoshiAmount) =
                transaction {
                    val entity = OrderEntity.findById(orderUuid) ?: throw ResourceNotFoundException("Order not found")
                    if (entity.status == "refunded") throw OrderAlreadyRefundedException()
                    if (entity.status != "paid") {
                        throw OrderNotRefundableException(
                            message = "Only paid orders can be refunded",
                            code = "order_not_paid",
                        )
                    }
                    val orderItems =
                        OrderProductsTable
                            .selectAll()
                            .where { OrderProductsTable.orderId eq entity.id }
                            .toList()
                    val paidSatoshiAmount =
                        (TicketsTable innerJoin TicketPaymentsTable innerJoin PaymentsTable)
                            .selectAll()
                            .where { TicketsTable.orderId eq entity.id }
                            .firstOrNull()
                            ?.get(PaymentsTable.satoshiAmount)
                    Triple(entity, orderItems, paidSatoshiAmount)
                }

            if (request.invoice.isNotBlank() && originalSatoshiAmount == null) {
                throw OrderNotRefundableException(
                    message = "This order has no Bitcoin payment to refund via Lightning",
                    code = "no_bitcoin_payment",
                )
            }

            val (satoshiAmount, paymentHash) =
                if (request.invoice.isNotBlank()) {
                    payRefundInvoice(orderId, request.invoice, originalSatoshiAmount)
                } else {
                    0L to null
                }

            transaction {
                items.forEach { restoreOrderLineStock(it) }

                order.status = "refunded"

                val refundedAt = LocalDateTime.now(configService.getConfiguredZoneId()).toString()
                val refundEntity =
                    RefundEntity.new(UUID.randomUUID()) {
                        this.orderId = order.id
                        this.refundInvoice = request.invoice
                        this.satoshiAmount = satoshiAmount
                        this.refundedAt = refundedAt
                        this.paymentHash = paymentHash
                    }

                logger.info("Refund persisted for order $orderId (refundId=${refundEntity.id.value})")

                StoreRefund(
                    id = refundEntity.id.value.toString(),
                    orderId = orderId,
                    refundInvoice = request.invoice,
                    satoshiAmount = satoshiAmount,
                    refundedAt = refundedAt,
                )
            }
        }

    private suspend fun payRefundInvoice(
        orderId: String,
        invoice: String,
        originalSatoshiAmount: Long?,
    ): Pair<Long, String?> {
        val decodedInvoice = Bolt11Decoder.decodeInvoice(invoice)
        val paymentHash = decodedInvoice?.paymentHash
        val invoiceAmountSat =
            decodedInvoice?.amountSat
                ?: throw OrderNotRefundableException(
                    message = "The refund invoice must specify an amount",
                    code = "refund_invoice_missing_amount",
                )
        if (invoiceAmountSat != originalSatoshiAmount) {
            throw OrderNotRefundableException(
                message = "The refund invoice amount does not match the amount owed",
                code = "refund_invoice_amount_mismatch",
            )
        }

        val alreadyPaidPayment = findAlreadyPaidOutgoingPayment(paymentHash)

        val satoshiAmount =
            if (alreadyPaidPayment != null) {
                logger.info("Refund invoice for order $orderId was already paid (hash=$paymentHash), skipping payInvoice")
                alreadyPaidPayment.sent
            } else {
                val paymentResponse = lightningBackend.payInvoice(PayInvoiceRequest(invoice = invoice))
                logger.info("Refund payment sent for order $orderId (hash=$paymentHash)")
                paymentResponse.recipientAmountSat
            }

        return satoshiAmount to paymentHash
    }

    private suspend fun findAlreadyPaidOutgoingPayment(paymentHash: String?): OutgoingPayment? {
        if (paymentHash == null) return null
        return runCatching { lightningBackend.getOutgoingPaymentByHash(paymentHash) }
            .getOrNull()
            ?.takeIf { it.isPaid }
    }

    fun getRefundedOrderPaymentHashes(hashes: List<String>): Set<String> =
        transaction {
            if (hashes.isEmpty()) return@transaction emptySet()

            (PaymentsTable innerJoin TicketPaymentsTable innerJoin TicketsTable innerJoin OrdersTable)
                .selectAll()
                .where { (PaymentsTable.paymentHash inList hashes) and (OrdersTable.status eq "refunded") }
                .map { it[PaymentsTable.paymentHash]!! }
                .toSet()
        }

    fun getRefundedPaymentHashes(hashes: List<String>): Set<String> =
        transaction {
            if (hashes.isEmpty()) return@transaction emptySet()

            RefundsTable
                .selectAll()
                .where { RefundsTable.paymentHash inList hashes }
                .map { it[RefundsTable.paymentHash]!! }
                .toSet()
        }
}
