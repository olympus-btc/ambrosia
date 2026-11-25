package pos.ambrosia.utest

import pos.ambrosia.models.ClientLogReport
import pos.ambrosia.models.ClientLogReportLimits
import pos.ambrosia.utils.RequestValidationException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class LogModelsValidationTest {
    private fun textOfLength(textLength: Int) = "x".repeat(textLength)

    @Test
    fun `accepts a client log report at every length limit`() {
        val contextAtLimits =
            (1..ClientLogReportLimits.MAXIMUM_CONTEXT_ENTRIES).associate { contextIndex ->
                "$contextIndex${textOfLength(ClientLogReportLimits.MAXIMUM_CONTEXT_KEY_LENGTH - contextIndex.toString().length)}" to
                    textOfLength(ClientLogReportLimits.MAXIMUM_CONTEXT_VALUE_LENGTH)
            }

        val clientLogReportAtLimits =
            ClientLogReport(
                level = textOfLength(ClientLogReportLimits.MAXIMUM_LEVEL_LENGTH),
                errorMessage = textOfLength(ClientLogReportLimits.MAXIMUM_ERROR_MESSAGE_LENGTH),
                stackTrace = textOfLength(ClientLogReportLimits.MAXIMUM_STACK_TRACE_LENGTH),
                url = textOfLength(ClientLogReportLimits.MAXIMUM_URL_LENGTH),
                userAgent = textOfLength(ClientLogReportLimits.MAXIMUM_USER_AGENT_LENGTH),
                origin = textOfLength(ClientLogReportLimits.MAXIMUM_ORIGIN_LENGTH),
                context = contextAtLimits,
            )

        assertEquals(ClientLogReportLimits.MAXIMUM_CONTEXT_ENTRIES, clientLogReportAtLimits.context.size)
    }

    @Test
    fun `rejects client log report text fields over their length limit`() {
        assertFailsWith<RequestValidationException> {
            ClientLogReport(level = textOfLength(ClientLogReportLimits.MAXIMUM_LEVEL_LENGTH + 1), errorMessage = "failed")
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(errorMessage = textOfLength(ClientLogReportLimits.MAXIMUM_ERROR_MESSAGE_LENGTH + 1))
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(errorMessage = "failed", stackTrace = textOfLength(ClientLogReportLimits.MAXIMUM_STACK_TRACE_LENGTH + 1))
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(errorMessage = "failed", url = textOfLength(ClientLogReportLimits.MAXIMUM_URL_LENGTH + 1))
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(errorMessage = "failed", userAgent = textOfLength(ClientLogReportLimits.MAXIMUM_USER_AGENT_LENGTH + 1))
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(errorMessage = "failed", origin = textOfLength(ClientLogReportLimits.MAXIMUM_ORIGIN_LENGTH + 1))
        }
    }

    @Test
    fun `rejects a client log report context that is too large`() {
        assertFailsWith<RequestValidationException> {
            ClientLogReport(
                errorMessage = "failed",
                context = (0..ClientLogReportLimits.MAXIMUM_CONTEXT_ENTRIES).associate { contextIndex -> "key$contextIndex" to "value" },
            )
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(
                errorMessage = "failed",
                context = mapOf(textOfLength(ClientLogReportLimits.MAXIMUM_CONTEXT_KEY_LENGTH + 1) to "value"),
            )
        }
        assertFailsWith<RequestValidationException> {
            ClientLogReport(
                errorMessage = "failed",
                context = mapOf("type" to textOfLength(ClientLogReportLimits.MAXIMUM_CONTEXT_VALUE_LENGTH + 1)),
            )
        }
    }
}
