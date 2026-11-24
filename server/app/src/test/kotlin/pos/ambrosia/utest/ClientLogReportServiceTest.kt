package pos.ambrosia.utest

import pos.ambrosia.models.ClientLogReport
import pos.ambrosia.models.ClientLogReportOrigins
import pos.ambrosia.services.ClientLogReportService
import kotlin.test.Test
import kotlin.test.assertEquals

class ClientLogReportServiceTest {
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
