package pos.ambrosia.utest

import kotlinx.serialization.json.Json
import pos.ambrosia.nwc.Nip47Info
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

/**
 * Regression tests for B1: Nip47Info deserialization was crashing when a real wallet
 * returned `block_hash: []` (a JSON array where a String was expected). The fix was to
 * drop the unused blockHash field entirely and add coerceInputValues = true to lenientJson.
 */
class Nip47DeserializationTest {
    private val lenientJson =
        Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
        }

    @Test
    fun `Nip47Info does not crash when block_hash is a JSON array`() {
        val json = """{"network":"mainnet","block_hash":[]}"""
        // Before the fix this threw: Expected JsonPrimitive, but had JsonArray
        val info = lenientJson.decodeFromString<Nip47Info>(json)
        assertEquals("mainnet", info.network)
    }

    @Test
    fun `Nip47Info does not crash when block_hash is absent`() {
        val json = """{"network":"testnet","block_height":800000}"""
        val info = lenientJson.decodeFromString<Nip47Info>(json)
        assertEquals("testnet", info.network)
        assertEquals(800_000, info.blockHeight)
    }

    @Test
    fun `Nip47Info network is null when field is missing`() {
        val json = """{"pubkey":"deadbeef"}"""
        val info = lenientJson.decodeFromString<Nip47Info>(json)
        assertNull(info.network)
    }

    @Test
    fun `Nip47Info ignores completely unknown fields`() {
        // alias, color, methods, notifications were dropped as part of N2 — verify they
        // round-trip cleanly as ignored unknown fields alongside arbitrary future_field.
        val json =
            """{"alias":"wallet","color":"#f00","methods":["pay_invoice"],""" +
                """"notifications":["payment_received"],"network":"mainnet",""" +
                """"future_field":"some_value","another":42}"""
        val info = lenientJson.decodeFromString<Nip47Info>(json)
        assertEquals("mainnet", info.network)
    }
}
