package pos.ambrosia.utest

import io.ktor.http.HttpStatusCode
import pos.ambrosia.utils.MalformedSecretsEnvelopeException
import pos.ambrosia.utils.RequestValidationException
import pos.ambrosia.utils.responseForThrowing
import kotlin.test.Test
import kotlin.test.assertEquals

class HandlerRequestValidationExceptionTest {
    @Test
    fun `maps RequestValidationException to 400 with its own message`() {
        val requestValidationHandlerResponse =
            responseForThrowing(RequestValidationException("businessPhone must be at most 50 characters"))

        assertEquals(HttpStatusCode.BadRequest, requestValidationHandlerResponse.status)
        assertEquals("""{"message":"businessPhone must be at most 50 characters"}""", requestValidationHandlerResponse.body)
    }

    @Test
    fun `maps MalformedSecretsEnvelopeException to 500 without leaking the stored envelope`() {
        val malformedSecretsEnvelopeHandlerResponse = responseForThrowing(MalformedSecretsEnvelopeException())

        assertEquals(HttpStatusCode.InternalServerError, malformedSecretsEnvelopeHandlerResponse.status)
        assertEquals("""{"message":"Malformed secrets envelope"}""", malformedSecretsEnvelopeHandlerResponse.body)
    }

    @Test
    fun `maps a bare IllegalArgumentException to 400 as a fallback for code outside this exception hierarchy`() {
        val bareIllegalArgumentHandlerResponse = responseForThrowing(IllegalArgumentException("amountSat must be positive"))

        assertEquals(HttpStatusCode.BadRequest, bareIllegalArgumentHandlerResponse.status)
        assertEquals("""{"message":"amountSat must be positive"}""", bareIllegalArgumentHandlerResponse.body)
    }
}
