package pos.ambrosia.utils

import kotlinx.serialization.Serializable

@Serializable
data class ParsedPurchasedItem(
    val name: String,
    val variantName: String?,
    val quantity: Int,
)

object InvoiceDescriptionParser {
    private val purchasedItemPattern = Regex("""^(\d+)x (.+?)(?: \((.+)\))?$""")

    fun parsePurchasedItems(description: String?): List<ParsedPurchasedItem> {
        if (description.isNullOrBlank()) return emptyList()

        return description.split(", ").mapNotNull { itemDescription ->
            val purchasedItemMatch = purchasedItemPattern.matchEntire(itemDescription.trim()) ?: return@mapNotNull null
            val purchasedQuantity = purchasedItemMatch.groupValues[1].toIntOrNull() ?: return@mapNotNull null
            ParsedPurchasedItem(
                name = purchasedItemMatch.groupValues[2],
                variantName = purchasedItemMatch.groupValues[3].ifBlank { null },
                quantity = purchasedQuantity,
            )
        }
    }
}
