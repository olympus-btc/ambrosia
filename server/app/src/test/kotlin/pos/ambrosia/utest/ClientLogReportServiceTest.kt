package pos.ambrosia.utest

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import org.junit.After
import org.slf4j.LoggerFactory
import pos.ambrosia.logging.LoggerNames
import pos.ambrosia.models.ClientLogReport
import pos.ambrosia.models.ClientLogReportOrigins
import pos.ambrosia.services.ClientLogReportService
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ClientLogReportServiceTest {
    private val clientLogger = LoggerFactory.getLogger(LoggerNames.CLIENT) as Logger
    private val recordedClientLogEvents = ListAppender<ILoggingEvent>().apply { start() }

    @After
    fun tearDown() {
        clientLogger.detachAppender(recordedClientLogEvents)
        ClientLogReportService.clientErrorReportingEnabled = true
    }

    @Test
    fun `records the report while app error reporting is enabled`() {
        clientLogger.addAppender(recordedClientLogEvents)

        ClientLogReportService.record(ClientLogReport(errorMessage = "Render failed"), reportingUserId = null)

        assertEquals(listOf("[browser] Render failed"), recordedClientLogEvents.list.map(ILoggingEvent::getFormattedMessage))
    }

    @Test
    fun `ignores the report while app error reporting is disabled`() {
        clientLogger.addAppender(recordedClientLogEvents)
        ClientLogReportService.clientErrorReportingEnabled = false

        ClientLogReportService.record(ClientLogReport(errorMessage = "Render failed"), reportingUserId = null)

        assertTrue(recordedClientLogEvents.list.isEmpty())
    }

    @Test
    fun `formats a single summary line followed by user agent and stack trace`() {
        val formattedReport =
            ClientLogReportService.formatReport(
                ClientLogReport(
                    errorMessage = "Cannot read properties\nof undefined",
                    stackTrace = "TypeError: Cannot read properties\n    at Cart (cart.js:1:1)",
                    url = "/store/cart",
                    userAgent = "Mozilla/5.0",
                    origin = ClientLogReportOrigins.NEXT_SERVER,
                    context = mapOf("type" to "window.error"),
                ),
                reportingUserId = "user-1",
            )

        val formattedLines = formattedReport.lines()
        assertEquals(
            "[next-server] Cannot read properties of undefined url=/store/cart user=user-1 type=window.error",
            formattedLines.first(),
        )
        assertEquals("userAgent: Mozilla/5.0", formattedLines[1])
        assertEquals("TypeError: Cannot read properties", formattedLines[2])
    }

    @Test
    fun `falls back to the browser origin for an unknown origin`() {
        val formattedReport =
            ClientLogReportService.formatReport(
                ClientLogReport(errorMessage = "Render failed", origin = "unknown-origin"),
                reportingUserId = null,
            )

        assertEquals("[browser] Render failed", formattedReport)
    }
}
