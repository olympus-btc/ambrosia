package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.WalletInvoiceRatesTable
import pos.ambrosia.logger
import pos.ambrosia.models.PaymentBitcoinData
import pos.ambrosia.models.WalletInvoiceRate

class WalletRateService {
    fun saveInvoiceRate(rate: WalletInvoiceRate) {
        transaction {
            WalletInvoiceRatesTable.deleteWhere { paymentHash eq rate.paymentHash }
            WalletInvoiceRatesTable.insert {
                it[paymentHash] = rate.paymentHash
                it[satoshiAmount] = rate.satoshiAmount
                it[exchangeRate] = rate.exchangeRate
                it[exchangeRateCurrency] = rate.exchangeRateCurrency
                it[fiatAmount] = rate.fiatAmount
            }
        }
        logger.info("Saved wallet invoice rate for paymentHash=${rate.paymentHash}")
    }

    fun getRatesByPaymentHashes(hashes: List<String>): Map<String, PaymentBitcoinData> {
        if (hashes.isEmpty()) return emptyMap()
        return transaction {
            WalletInvoiceRatesTable
                .selectAll()
                .where { WalletInvoiceRatesTable.paymentHash inList hashes }
                .associate { row ->
                    row[WalletInvoiceRatesTable.paymentHash] to
                        PaymentBitcoinData(
                            exchangeRateAtPayment = row[WalletInvoiceRatesTable.exchangeRate],
                            exchangeRateCurrency = row[WalletInvoiceRatesTable.exchangeRateCurrency],
                            fiatAmountAtPayment = row[WalletInvoiceRatesTable.fiatAmount],
                        )
                }
        }
    }
}
