package pos.ambrosia.utils

import fr.acinq.lightning.payment.Bolt11Invoice

data class DecodedInvoice(
    val amountSat: Long?,
    val description: String?,
)

object Bolt11Decoder {
    fun extractDescription(invoice: String?): String? {
        if (invoice.isNullOrBlank()) return null
        return try {
            val parsedInvoice = Bolt11Invoice.read(invoice).get()
            parsedInvoice.description
        } catch (e: Exception) {
            null
        }
    }

    fun decodeInvoice(invoice: String?): DecodedInvoice? {
        if (invoice.isNullOrBlank()) return null
        return try {
            val parsedInvoice = Bolt11Invoice.read(invoice).get()
            DecodedInvoice(
                amountSat = parsedInvoice.amount?.truncateToSatoshi()?.toLong(),
                description = parsedInvoice.description,
            )
        } catch (e: Exception) {
            null
        }
    }

    fun extractAmountSat(invoice: String?): Long? {
        if (invoice.isNullOrBlank()) return null
        return try {
            val parsed = Bolt11Invoice.read(invoice).get()
            parsed.amount?.msat?.div(1000)
        } catch (e: Exception) {
            null
        }
    }

    fun extractPaymentHash(invoice: String?): String? {
        if (invoice.isNullOrBlank()) return null
        return try {
            val parsed = Bolt11Invoice.read(invoice).get()
            parsed.paymentHash.toHex()
        } catch (e: Exception) {
            null
        }
    }
}
