package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object CurrencyTable : SQLiteUUIDTable("currency") {
    val acronym = varchar("acronym", 3).uniqueIndex()
    val name = varchar("name", 255).nullable()
    val symbol = varchar("symbol", 10).nullable()
    val countryName = varchar("country_name", 255).nullable()
    val countryCode = varchar("country_code", 10).nullable()
}

class CurrencyEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<CurrencyEntity>(CurrencyTable)

    var acronym by CurrencyTable.acronym
    var name by CurrencyTable.name
    var symbol by CurrencyTable.symbol
    var countryName by CurrencyTable.countryName
    var countryCode by CurrencyTable.countryCode
}

object PaymentMethodsTable : SQLiteUUIDTable("payment_methods") {
    val name = varchar("name", 255).uniqueIndex()
}

class PaymentMethodEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PaymentMethodEntity>(PaymentMethodsTable)

    var name by PaymentMethodsTable.name
}

object PaymentsTable : SQLiteUUIDTable("payments") {
    val methodId = reference("method_id", PaymentMethodsTable)
    val currencyId = reference("currency_id", CurrencyTable)
    val transactionId = text("transaction_id")
    val amount = double("amount")
    val date = varchar("date", 50)
    val satoshiAmount = long("satoshi_amount").nullable()
    val exchangeRateAtPayment = double("exchange_rate_at_payment").nullable()
    val paymentHash = text("payment_hash").nullable().uniqueIndex()
    val exchangeRateCurrency = varchar("exchange_rate_currency", 10).nullable()
    val fiatAmountAtPayment = double("fiat_amount_at_payment").nullable()
}

class PaymentEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PaymentEntity>(PaymentsTable)

    var methodId by PaymentsTable.methodId
    var currencyId by PaymentsTable.currencyId
    var transactionId by PaymentsTable.transactionId
    var amount by PaymentsTable.amount
    var date by PaymentsTable.date
    var satoshiAmount by PaymentsTable.satoshiAmount
    var exchangeRateAtPayment by PaymentsTable.exchangeRateAtPayment
    var paymentHash by PaymentsTable.paymentHash
    var exchangeRateCurrency by PaymentsTable.exchangeRateCurrency
    var fiatAmountAtPayment by PaymentsTable.fiatAmountAtPayment
}

object BaseCurrencyTable : Table("base_currency") {
    val id = integer("id")
    val currencyId = reference("currency_id", CurrencyTable)
    override val primaryKey = PrimaryKey(id)
}
