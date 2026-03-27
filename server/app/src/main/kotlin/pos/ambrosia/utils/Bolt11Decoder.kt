package pos.ambrosia.utils

import fr.acinq.lightning.payment.Bolt11Invoice

object Bolt11Decoder {
    fun extractDescription(invoice: String?): String? {
        if (invoice.isNullOrBlank()) return null
        return try {
            val parsed = Bolt11Invoice.read(invoice).get()
            parsed.description
        } catch (e: Exception) {
            null
        }
    }
}
