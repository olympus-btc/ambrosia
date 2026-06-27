package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table

object WalletInvoiceRatesTable : Table("wallet_invoice_rates") {
    val paymentHash = varchar("payment_hash", 1024)
    val satoshiAmount = long("satoshi_amount").nullable()
    val exchangeRate = double("exchange_rate")
    val exchangeRateCurrency = varchar("exchange_rate_currency", 10)
    val fiatAmount = double("fiat_amount").nullable()
    val createdAt = varchar("created_at", 50).nullable()
    override val primaryKey = PrimaryKey(paymentHash)
}
