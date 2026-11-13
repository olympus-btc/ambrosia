package pos.ambrosia.utest

import pos.ambrosia.utils.InvoiceDescriptionParser
import pos.ambrosia.utils.ParsedPurchasedItem
import kotlin.test.Test
import kotlin.test.assertEquals

class InvoiceDescriptionParserTest {
    @Test
    fun `given null description returns empty list`() {
        assertEquals(emptyList(), InvoiceDescriptionParser.parsePurchasedItems(null))
    }

    @Test
    fun `given blank description returns empty list`() {
        assertEquals(emptyList(), InvoiceDescriptionParser.parsePurchasedItems(""))
        assertEquals(emptyList(), InvoiceDescriptionParser.parsePurchasedItems("   "))
    }

    @Test
    fun `given item without variant returns name with null variant`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("1x Café")
        assertEquals(listOf(ParsedPurchasedItem("Café", null, 1)), parsedItems)
    }

    @Test
    fun `given item with variant returns name and variant separately`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("1x Café (Grande)")
        assertEquals(listOf(ParsedPurchasedItem("Café", "Grande", 1)), parsedItems)
    }

    @Test
    fun `given multiple items mixing variant and no variant parses each one`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("2x Matcha, 1x Bagel (Integral)")
        assertEquals(
            listOf(
                ParsedPurchasedItem("Matcha", null, 2),
                ParsedPurchasedItem("Bagel", "Integral", 1),
            ),
            parsedItems,
        )
    }

    @Test
    fun `given multi-digit quantity parses it as an integer`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("10x Agua")
        assertEquals(listOf(ParsedPurchasedItem("Agua", null, 10)), parsedItems)
    }

    @Test
    fun `given a name with internal spaces keeps the full name`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("1x Café Americano")
        assertEquals(listOf(ParsedPurchasedItem("Café Americano", null, 1)), parsedItems)
    }

    @Test
    fun `given a segment that does not match the expected format skips it`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("1x Matcha, not a valid segment")
        assertEquals(listOf(ParsedPurchasedItem("Matcha", null, 1)), parsedItems)
    }

    @Test
    fun `given a product name that itself contains parentheses misreads it as a variant`() {
        val parsedItems = InvoiceDescriptionParser.parsePurchasedItems("1x Café (Orgánico)")
        assertEquals(listOf(ParsedPurchasedItem("Café", "Orgánico", 1)), parsedItems)
    }
}
