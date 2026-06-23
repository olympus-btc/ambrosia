package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.PaymentBitcoinData
import pos.ambrosia.models.WalletInvoiceRate
import java.sql.Connection

class WalletRateService(
    private val connection: Connection,
) {
    companion object {
        private const val INSERT_WALLET_INVOICE_RATE =
            """
            INSERT OR REPLACE INTO wallet_invoice_rates
                (payment_hash, satoshi_amount, exchange_rate, exchange_rate_currency, fiat_amount)
            VALUES (?, ?, ?, ?, ?)
            """

        private const val GET_RATES_BY_PAYMENT_HASHES =
            """
            SELECT payment_hash, exchange_rate, exchange_rate_currency, fiat_amount
            FROM wallet_invoice_rates
            WHERE payment_hash IN (%s)
            """
    }

    suspend fun saveInvoiceRate(rate: WalletInvoiceRate) {
        connection.prepareStatement(INSERT_WALLET_INVOICE_RATE).use { statement ->
            statement.setString(1, rate.paymentHash)
            if (rate.satoshiAmount != null) {
                statement.setLong(2, rate.satoshiAmount)
            } else {
                statement.setNull(2, java.sql.Types.INTEGER)
            }
            statement.setDouble(3, rate.exchangeRate)
            statement.setString(4, rate.exchangeRateCurrency)
            if (rate.fiatAmount != null) {
                statement.setDouble(5, rate.fiatAmount)
            } else {
                statement.setNull(5, java.sql.Types.REAL)
            }
            statement.executeUpdate()
        }
        logger.info("Saved wallet invoice rate for paymentHash=${rate.paymentHash}")
    }

    suspend fun getRatesByPaymentHashes(hashes: List<String>): Map<String, PaymentBitcoinData> {
        if (hashes.isEmpty()) return emptyMap()
        val placeholders = hashes.joinToString(",") { "?" }
        val walletRatesQuery = String.format(GET_RATES_BY_PAYMENT_HASHES, placeholders)
        val walletRatesByHash = mutableMapOf<String, PaymentBitcoinData>()
        connection.prepareStatement(walletRatesQuery).use { statement ->
            hashes.forEachIndexed { index, hash -> statement.setString(index + 1, hash) }
            val resultSet = statement.executeQuery()
            while (resultSet.next()) {
                val paymentHash = resultSet.getString("payment_hash")
                val exchangeRate = resultSet.getDouble("exchange_rate")
                val exchangeRateCurrency = resultSet.getString("exchange_rate_currency")
                val fiatAmount = (resultSet.getObject("fiat_amount") as? Number)?.toDouble()
                walletRatesByHash[paymentHash] = PaymentBitcoinData(exchangeRate, exchangeRateCurrency, fiatAmount)
            }
        }
        return walletRatesByHash
    }
}
