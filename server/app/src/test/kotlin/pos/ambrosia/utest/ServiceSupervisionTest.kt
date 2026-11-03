package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.server.application.call
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import pos.ambrosia.utils.canRestartSelf
import pos.ambrosia.utils.isLocalPhoenixd
import kotlin.test.Test
import kotlin.test.assertEquals

class ServiceSupervisionTest {
    @Test
    fun `isLocalPhoenixd is true when neither phoenixd-remote nor nwc-uri are configured`() =
        testApplication {
            application { routing { get("/probe") { call.respondText(call.isLocalPhoenixd().toString()) } } }

            assertEquals("true", client.get("/probe").bodyAsText())
        }

    @Test
    fun `isLocalPhoenixd is false when phoenixd-remote is enabled`() =
        testApplication {
            environment { config = MapApplicationConfig("phoenixd-remote" to "true") }
            application { routing { get("/probe") { call.respondText(call.isLocalPhoenixd().toString()) } } }

            assertEquals("false", client.get("/probe").bodyAsText())
        }

    @Test
    fun `isLocalPhoenixd is false when an nwc-uri is configured`() =
        testApplication {
            environment { config = MapApplicationConfig("nwc-uri" to "nostr+walletconnect://pubkey?relay=wss://relay") }
            application { routing { get("/probe") { call.respondText(call.isLocalPhoenixd().toString()) } } }

            assertEquals("false", client.get("/probe").bodyAsText())
        }

    @Test
    fun `canRestartSelf is true when the docker config flag is set`() =
        testApplication {
            environment { config = MapApplicationConfig("docker" to "true") }
            application { routing { get("/probe") { call.respondText(call.canRestartSelf().toString()) } } }

            assertEquals("true", client.get("/probe").bodyAsText())
        }

    @Test
    fun `canRestartSelf is false without the docker flag or a systemd invocation id`() =
        testApplication {
            application { routing { get("/probe") { call.respondText(call.canRestartSelf().toString()) } } }

            assertEquals("false", client.get("/probe").bodyAsText())
        }
}
