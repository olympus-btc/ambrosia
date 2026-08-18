package pos.ambrosia.utest

import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.server.testing.testApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import pos.ambrosia.nwc.NostrRelay
import pos.ambrosia.utils.NwcConnectionException
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

private fun firstConnectionAttemptFailsEntirely(): Boolean {
    var onDisconnectInvoked = false
    testApplication {
        val client = createClient { install(WebSockets) }
        val relay = NostrRelay(url = "/no-such-relay", httpClient = client)
        val relayScope = CoroutineScope(Dispatchers.Default + Job())
        try {
            assertFailsWith<NwcConnectionException> {
                relay.connect(relayScope, onDisconnect = { onDisconnectInvoked = true })
            }
        } finally {
            relayScope.cancel()
        }
    }
    return onDisconnectInvoked
}

class NostrRelayTest {
    @Test
    fun `onDisconnect is not invoked when the very first connection attempt fails entirely`() {
        assertFalse(firstConnectionAttemptFailsEntirely())
    }
}
