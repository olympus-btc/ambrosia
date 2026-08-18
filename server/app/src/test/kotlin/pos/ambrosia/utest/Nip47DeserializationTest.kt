package pos.ambrosia.utest

import kotlinx.serialization.json.Json
import pos.ambrosia.nwc.Nip47Info
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class Nip47DeserializationTest {
    private val lenientJson =
        Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
        }

    @Test
    fun `Nip47Info does not crash when block_hash is a JSON array`() {
        val json = """{"network":"mainnet","block_hash":[]}"""
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
        val json =
            """{"alias":"wallet","color":"#f00","methods":["pay_invoice"],""" +
                """"notifications":["payment_received"],"network":"mainnet",""" +
                """"future_field":"some_value","another":42}"""
        val info = lenientJson.decodeFromString<Nip47Info>(json)
        assertEquals("mainnet", info.network)
    }
}
