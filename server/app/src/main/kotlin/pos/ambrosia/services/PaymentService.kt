package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.isNotNull
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CurrencyEntity
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.logger
import pos.ambrosia.models.Currency
import pos.ambrosia.models.Payment
import pos.ambrosia.models.PaymentBitcoinData
import pos.ambrosia.models.PaymentMethod
import java.time.LocalDateTime
import java.util.UUID

class PaymentService {
    private fun toModel(entity: PaymentEntity): Payment =
        Payment(
            id = entity.id.value.toString(),
            methodId = entity.methodId.value.toString(),
            currencyId = entity.currencyId.value.toString(),
            transactionId = entity.transactionId,
            amount = entity.amount,
        )

    private fun toModel(entity: CurrencyEntity): Currency =
        Currency(
            id = entity.id.value.toString(),
            acronym = entity.acronym,
            name = entity.name,
            symbol = entity.symbol,
            countryName = entity.countryName,
            countryCode = entity.countryCode,
        )

    private fun paymentInUse(paymentId: String): Boolean =
        !TicketPaymentsTable
            .selectAll()
            .where { TicketPaymentsTable.paymentId eq EntityID(UUID.fromString(paymentId), PaymentsTable) }
            .empty()

    private fun paymentMethodExists(methodId: String): Boolean = PaymentMethodEntity.findById(UUID.fromString(methodId)) != null

    private fun currencyExists(currencyId: String): Boolean = CurrencyEntity.findById(UUID.fromString(currencyId)) != null

    fun getPaymentMethods(): List<PaymentMethod> =
        transaction {
            val paymentMethods =
                PaymentMethodEntity.all().map { PaymentMethod(id = it.id.value.toString(), name = it.name) }
            logger.info("Retrieved ${paymentMethods.size} payment methods")
            paymentMethods
        }

    fun getPaymentMethodById(id: String): PaymentMethod? =
        transaction {
            val entity = PaymentMethodEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.warn("Payment method not found with ID: $id")
                null
            } else {
                PaymentMethod(id = entity.id.value.toString(), name = entity.name)
            }
        }

    fun getCurrencies(): List<Currency> =
        transaction {
            val currencies = CurrencyEntity.all().map { toModel(it) }
            logger.info("Retrieved ${currencies.size} currencies")
            currencies
        }

    fun getCurrencyById(id: String): Currency? =
        transaction {
            val entity = CurrencyEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.warn("Currency not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getExchangeRatesByPaymentHashes(hashes: List<String>): Map<String, PaymentBitcoinData> =
        transaction {
            if (hashes.isEmpty()) return@transaction emptyMap()

            PaymentsTable
                .selectAll()
                .where { (PaymentsTable.paymentHash inList hashes) and (PaymentsTable.exchangeRateAtPayment.isNotNull()) }
                .associate {
                    it[PaymentsTable.paymentHash]!! to
                        PaymentBitcoinData(
                            exchangeRateAtPayment = it[PaymentsTable.exchangeRateAtPayment]!!,
                            exchangeRateCurrency = it[PaymentsTable.exchangeRateCurrency],
                            fiatAmountAtPayment = it[PaymentsTable.fiatAmountAtPayment],
                        )
                }
        }

    fun addPayment(payment: Payment): String? =
        transaction {
            if (payment.methodId.isBlank() || payment.currencyId.isBlank()) {
                logger.error("Method ID, currency ID and transaction ID are required fields")
                return@transaction null
            }

            if (!paymentMethodExists(payment.methodId)) {
                logger.error("Payment method ID does not exist: ${payment.methodId}")
                return@transaction null
            }

            if (!currencyExists(payment.currencyId)) {
                logger.error("Currency ID does not exist: ${payment.currencyId}")
                return@transaction null
            }

            val id =
                PaymentEntity
                    .new(UUID.randomUUID()) {
                        this.methodId = EntityID(UUID.fromString(payment.methodId), PaymentMethodsTable)
                        this.currencyId = EntityID(UUID.fromString(payment.currencyId), CurrencyTable)
                        this.transactionId = payment.transactionId ?: ""
                        this.amount = payment.amount
                        this.date = LocalDateTime.now().toString()
                    }.id.value
                    .toString()
            logger.info("Payment created successfully with ID: $id")
            id
        }

    fun getPayments(): List<Payment> =
        transaction {
            val payments = PaymentEntity.all().map { toModel(it) }
            logger.info("Retrieved ${payments.size} payments")
            payments
        }

    fun getPaymentById(id: String): Payment? =
        transaction {
            val entity = PaymentEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.warn("Payment not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun updatePayment(payment: Payment): Boolean =
        transaction {
            if (payment.id == null) {
                logger.error("Cannot update payment: ID is null")
                return@transaction false
            }

            if (payment.methodId.isBlank() || payment.currencyId.isBlank()) {
                logger.error("Method ID, currency ID and transaction ID are required fields")
                return@transaction false
            }

            if (!paymentMethodExists(payment.methodId)) {
                logger.error("Payment method ID does not exist: ${payment.methodId}")
                return@transaction false
            }

            if (!currencyExists(payment.currencyId)) {
                logger.error("Currency ID does not exist: ${payment.currencyId}")
                return@transaction false
            }

            val entity = PaymentEntity.findById(UUID.fromString(payment.id))
            if (entity == null) {
                logger.error("Failed to update payment: ${payment.id}")
                false
            } else {
                entity.methodId = EntityID(UUID.fromString(payment.methodId), PaymentMethodsTable)
                entity.currencyId = EntityID(UUID.fromString(payment.currencyId), CurrencyTable)
                entity.transactionId = payment.transactionId ?: ""
                entity.amount = payment.amount
                logger.info("Payment updated successfully: ${payment.id}")
                true
            }
        }

    fun deletePayment(id: String): Boolean =
        transaction {
            if (paymentInUse(id)) {
                logger.error("Cannot delete payment $id: it's being used in transactions")
                return@transaction false
            }

            val entity = PaymentEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete payment: $id")
                false
            } else {
                entity.delete()
                logger.info("Payment deleted successfully: $id")
                true
            }
        }
}
