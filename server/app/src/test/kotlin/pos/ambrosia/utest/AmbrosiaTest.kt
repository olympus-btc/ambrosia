package pos.ambrosia.utest

import pos.ambrosia.computePhoenixdWebhookUrl
import kotlin.test.Test
import kotlin.test.assertEquals

class AmbrosiaTest {
    @Test
    fun `computePhoenixdWebhookUrl uses the ambrosia hostname when running in docker`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = true, httpBindIp = "0.0.0.0", httpBindPort = 9154)

        assertEquals("http://ambrosia:9154/webhook/phoenixd", webhookUrl)
    }

    @Test
    fun `computePhoenixdWebhookUrl falls back to 127-0-0-1 when the bind ip is a wildcard`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = false, httpBindIp = "0.0.0.0", httpBindPort = 9154)

        assertEquals("http://127.0.0.1:9154/webhook/phoenixd", webhookUrl)
    }

    @Test
    fun `computePhoenixdWebhookUrl uses the explicit bind ip when it is not a wildcard`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = false, httpBindIp = "192.168.1.50", httpBindPort = 9154)

        assertEquals("http://192.168.1.50:9154/webhook/phoenixd", webhookUrl)
    }
}
