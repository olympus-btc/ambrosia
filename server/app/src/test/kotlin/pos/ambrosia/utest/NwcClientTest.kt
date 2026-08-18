package pos.ambrosia.utest

import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.server.application.install
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.webSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch
import pos.ambrosia.nwc.NwcClient
import pos.ambrosia.nwc.NwcConnectionInfo
import kotlin.test.Test
import kotlin.test.assertTrue
import io.ktor.server.websocket.WebSockets as ServerWebSockets

private const val TEST_WALLET_PUBKEY_HEX = "7bf8c2495f3342c80e0cbdd0d306e19d0c44762c773195289c3a77d76bf70bdb"
private const val TEST_CLIENT_SECRET_HEX = "ef99a279c64d8f63f87103577ad699aef0e83253925cfad4446b4f254eba7652"

private suspend fun DefaultWebSocketServerSession.absorbFramesWithoutReplying() {
    for (frame in incoming) {
    }
}

private fun pendingRequestsAreClearedAfterAnExternallyCancelledRequest(): Boolean {
    var pendingRequestsEmptyAfterCancellation = false
    testApplication {
        application {
            install(ServerWebSockets)
            routing {
                webSocket("/relay") { absorbFramesWithoutReplying() }
            }
        }
        val client = createClient { install(WebSockets) }
        val connectionInfo =
            NwcConnectionInfo(
                walletPubkeyHex = TEST_WALLET_PUBKEY_HEX,
                relayUrl = "/relay",
                secretHex = TEST_CLIENT_SECRET_HEX,
            )
        val nwcClient = NwcClient(connectionInfo, client)
        val clientScope = CoroutineScope(Dispatchers.Default + Job())
        try {
            nwcClient.connect(clientScope)
            val requestJob = clientScope.launch { nwcClient.getBalance() }
            requestJob.cancelAndJoin()
            pendingRequestsEmptyAfterCancellation = nwcClient.pendingRequests.isEmpty()
        } finally {
            clientScope.cancel()
        }
    }
    return pendingRequestsEmptyAfterCancellation
}

class NwcClientTest {
    @Test
    fun `pendingRequests entry is removed when the caller cancels before a response arrives`() {
        assertTrue(pendingRequestsAreClearedAfterAnExternallyCancelledRequest())
    }
}
