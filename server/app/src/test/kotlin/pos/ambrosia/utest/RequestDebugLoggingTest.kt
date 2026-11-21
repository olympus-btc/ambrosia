package pos.ambrosia.utest

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.install
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import org.slf4j.LoggerFactory
import pos.ambrosia.logging.LoggerNames
import pos.ambrosia.logging.RequestDebugLogging
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RequestDebugLoggingTest {
    private val requestDebugLogger = LoggerFactory.getLogger(LoggerNames.HTTP_REQUESTS) as Logger
    private val capturedRequestLogEvents = ListAppender<ILoggingEvent>()
    private var previousRequestDebugLoggerLevel: Level? = null

    @Before
    fun setUp() {
        previousRequestDebugLoggerLevel = requestDebugLogger.level
        capturedRequestLogEvents.start()
        requestDebugLogger.addAppender(capturedRequestLogEvents)
    }

    @After
    fun tearDown() {
        requestDebugLogger.detachAppender(capturedRequestLogEvents)
        requestDebugLogger.level = previousRequestDebugLoggerLevel
    }

    private fun capturedRequestLogMessages(): List<String> =
        capturedRequestLogEvents.list.map { capturedRequestLogEvent -> capturedRequestLogEvent.formattedMessage }

    @Test
    fun `logs method path status and duration without the query string when debug is enabled`() =
        testApplication {
            requestDebugLogger.level = Level.DEBUG
            application {
                install(RequestDebugLogging)
                routing {
                    get("/products") { call.respondText("ok") }
                    get("/missing") { call.respond(HttpStatusCode.NotFound) }
                }
            }

            client.get("/products?search=secret-search-text")
            client.get("/missing")

            val requestLogMessages = capturedRequestLogMessages()
            assertEquals(2, requestLogMessages.size)
            assertTrue(requestLogMessages[0].matches(Regex("GET /products 200 \\d+ms")), requestLogMessages[0])
            assertTrue(requestLogMessages[1].startsWith("GET /missing 404 "), requestLogMessages[1])
            assertTrue(requestLogMessages.none { requestLogMessage -> requestLogMessage.contains("secret-search-text") })
        }

    @Test
    fun `does not log health checks`() =
        testApplication {
            requestDebugLogger.level = Level.DEBUG
            application {
                install(RequestDebugLogging)
                routing { get("/health") { call.respondText("ok") } }
            }

            client.get("/health")

            assertEquals(emptyList(), capturedRequestLogMessages())
        }

    @Test
    fun `does not log requests when the level is info`() =
        testApplication {
            requestDebugLogger.level = Level.INFO
            application {
                install(RequestDebugLogging)
                routing { get("/products") { call.respondText("ok") } }
            }

            client.get("/products")

            assertEquals(emptyList(), capturedRequestLogMessages())
        }
}
