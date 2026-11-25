package pos.ambrosia.utest

import pos.ambrosia.logging.LogRedaction
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LogRedactionTest {
    private fun encodeJsonWebTokenSegment(jsonWebTokenSegment: String): String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(jsonWebTokenSegment.toByteArray())

    @Test
    fun `masks values of sensitive keys written with equals or colon`() {
        val redactedText = LogRedaction.redact("""login password=hunter2 secret: abc123 "token":"xyz" pin=0000""")

        assertEquals("""login password=*** secret: *** "token":"***" pin=***""", redactedText)
    }

    @Test
    fun `masks json values that contain spaces`() {
        val redactedText = LogRedaction.redact("""{"password": "correct horse battery", "name": "Ana"}""")

        assertEquals("""{"password": "***", "name": "Ana"}""", redactedText)
    }

    @Test
    fun `keeps plain words after a sensitive key followed by a colon`() {
        val readableMessages =
            listOf(
                "Invalid token: Refresh token is required",
                "Invalid token: User ID not found in token",
                "Secret: missing from configuration",
            )

        readableMessages.forEach { readableMessage ->
            assertEquals(readableMessage, LogRedaction.redact(readableMessage))
        }
    }

    @Test
    fun `masks colon values that look like credentials`() {
        val redactedText = LogRedaction.redact("pin: 1234 secret: ThisIsALongPassphraseValue token: abc123")

        assertEquals("pin: *** secret: *** token: ***", redactedText)
    }

    @Test
    fun `masks bearer tokens and json web tokens`() {
        val jsonWebToken =
            listOf("""{"alg":"HS256"}""", """{"userId":"1"}""", "signature")
                .joinToString(".") { jsonWebTokenSegment -> encodeJsonWebTokenSegment(jsonWebTokenSegment) }

        val redactedText = LogRedaction.redact("Authorization header Bearer abc.def-ghi and cookie $jsonWebToken")

        assertFalse(redactedText.contains("abc.def-ghi"))
        assertFalse(redactedText.contains(jsonWebToken))
        assertTrue(redactedText.contains("Bearer ***"))
    }

    @Test
    fun `masks nostr wallet connect uris and url credentials`() {
        val redactedText =
            LogRedaction.redact(
                "nwc nostr+walletconnect://pubkey?relay=wss://relay&secret=deadbeef remote http://user:pass@node:9740/info",
            )

        assertEquals("nwc nostr+walletconnect://*** remote http://***@node:9740/info", redactedText)
    }

    @Test
    fun `keeps text without secrets unchanged`() {
        val plainText = "Order 42 paid with 1500 sats; spinner ready"

        assertEquals(plainText, LogRedaction.redact(plainText))
    }
}
