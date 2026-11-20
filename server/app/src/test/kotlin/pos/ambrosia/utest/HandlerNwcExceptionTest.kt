package pos.ambrosia.utest

import io.ktor.http.HttpStatusCode
import pos.ambrosia.utils.NwcConnectionException
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.PhoenixServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import pos.ambrosia.utils.responseForThrowing
import kotlin.test.Test
import kotlin.test.assertEquals

class HandlerNwcExceptionTest {
    @Test
    fun `maps NwcConnectionException to 503 without leaking the internal message`() {
        val nwcConnectionHandlerResponse = responseForThrowing(NwcConnectionException("relay socket reset by peer"))

        assertEquals(HttpStatusCode.ServiceUnavailable, nwcConnectionHandlerResponse.status)
        assertEquals(
            """{"message":"NWC wallet relay is unavailable","code":"nwc_connection_failed","source":"ambrosia","category":"unknown"}""",
            nwcConnectionHandlerResponse.body,
        )
    }

    @Test
    fun `maps NwcServiceException to 503 without leaking the internal message`() {
        val nwcServiceHandlerResponse = responseForThrowing(NwcServiceException("NWC get_balance failed: [500] internal error"))

        assertEquals(HttpStatusCode.ServiceUnavailable, nwcServiceHandlerResponse.status)
        assertEquals("""{"message":"NWC wallet service error"}""", nwcServiceHandlerResponse.body)
    }

    @Test
    fun `maps UnsupportedBackendOperationException to 501 with its own message`() {
        val unsupportedOperationHandlerResponse =
            responseForThrowing(UnsupportedBackendOperationException("Seed export is not available with NWC backend"))

        assertEquals(HttpStatusCode.NotImplemented, unsupportedOperationHandlerResponse.status)
        assertEquals(
            """{"message":"Seed export is not available with NWC backend","code":"unsupported_operation","source":"ambrosia","category":"unknown"}""",
            unsupportedOperationHandlerResponse.body,
        )
    }

    @Test
    fun `maps PhoenixServiceException to wallet error response with category`() {
        val phoenixServiceHandlerResponse =
            responseForThrowing(
                PhoenixServiceException(
                    message = "Recipient node rejected the payment",
                    code = "recipient_rejected_payment",
                    category = "remote_routing",
                    statusCode = 422,
                ),
            )

        assertEquals(HttpStatusCode.UnprocessableEntity, phoenixServiceHandlerResponse.status)
        assertEquals(
            """{"message":"Recipient node rejected the payment","code":"recipient_rejected_payment","source":"phoenixd","category":"remote_routing"}""",
            phoenixServiceHandlerResponse.body,
        )
    }
}
