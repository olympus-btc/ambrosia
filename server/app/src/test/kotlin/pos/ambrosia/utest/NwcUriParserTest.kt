package pos.ambrosia.utest

import pos.ambrosia.nwc.parseNwcUri
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class NwcUriParserTest {
    private val pubkey64 = "b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4"
    private val secret64 = "71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c"

    private val fullUri =
        "nostr+walletconnect://$pubkey64" +
            "?relay=wss%3A%2F%2Frelay.getalby.com" +
            "&secret=$secret64" +
            "&lud16=user%40example.com"

    @Test
    fun `parses wallet pubkey`() {
        assertEquals(pubkey64, parseNwcUri(fullUri).walletPubkeyHex)
    }

    @Test
    fun `URL-decodes relay parameter`() {
        assertEquals("wss://relay.getalby.com", parseNwcUri(fullUri).relayUrl)
    }

    @Test
    fun `parses secret`() {
        assertEquals(secret64, parseNwcUri(fullUri).secretHex)
    }

    @Test
    fun `parses optional lud16`() {
        assertEquals("user@example.com", parseNwcUri(fullUri).lud16)
    }

    @Test
    fun `lud16 is null when absent`() {
        val uri = "nostr+walletconnect://$pubkey64?relay=wss%3A%2F%2Frelay.example.com&secret=$secret64"
        assertNull(parseNwcUri(uri).lud16)
    }

    @Test
    fun `throws on wrong scheme`() {
        assertFailsWith<IllegalArgumentException> {
            parseNwcUri("walletconnect://$pubkey64?relay=wss://r&secret=abc")
        }
    }

    @Test
    fun `throws when relay is missing`() {
        val uri = "nostr+walletconnect://$pubkey64?secret=$secret64"
        assertFailsWith<IllegalStateException> { parseNwcUri(uri) }
    }

    @Test
    fun `throws when secret is missing`() {
        val uri = "nostr+walletconnect://$pubkey64?relay=wss%3A%2F%2Frelay.example.com"
        assertFailsWith<IllegalStateException> { parseNwcUri(uri) }
    }

    @Test
    fun `throws when pubkey is shorter than 64 chars`() {
        assertFailsWith<IllegalArgumentException> {
            parseNwcUri("nostr+walletconnect://tooshort?relay=wss%3A%2F%2Fr&secret=abc")
        }
    }

    @Test
    fun `when multiple relay params appear last one wins`() {
        // Current implementation uses associate() which keeps the last duplicate key.
        // Known limitation: NWC spec supports multiple relay fallbacks but only one is used.
        val uri =
            "nostr+walletconnect://$pubkey64" +
                "?relay=wss%3A%2F%2Frelay1.example.com" +
                "&relay=wss%3A%2F%2Frelay2.example.com" +
                "&secret=$secret64"
        assertEquals("wss://relay2.example.com", parseNwcUri(uri).relayUrl)
    }
}
