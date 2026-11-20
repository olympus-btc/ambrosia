package pos.ambrosia.utest

import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CreateOffer
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.utils.RequestValidationException
import kotlin.test.Test
import kotlin.test.assertFailsWith

class PhoenixModelsValidationTest {
    @Test
    fun `rejects CreateInvoiceRequest fields over their configured length limit`() {
        val validRequest = CreateInvoiceRequest(description = "coffee and a pastry")

        assertFailsWith<RequestValidationException> { validRequest.copy(description = "x".repeat(5001)) }
        assertFailsWith<RequestValidationException> { validRequest.copy(externalId = "x".repeat(501)) }
        assertFailsWith<RequestValidationException> { validRequest.copy(exchangeRateCurrency = "x".repeat(11)) }
    }

    @Test
    fun `rejects CreateOffer fields over their configured length limit`() {
        val validOffer = CreateOffer()

        assertFailsWith<RequestValidationException> { validOffer.copy(description = "x".repeat(5001)) }
    }

    @Test
    fun `rejects PayOfferRequest fields over their configured length limit`() {
        val validPayOfferRequest = PayOfferRequest(offer = "lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrcgqcdnet6yzc")

        assertFailsWith<RequestValidationException> { validPayOfferRequest.copy(message = "x".repeat(5001)) }
    }

    @Test
    fun `rejects PayInvoiceRequest fields over their configured length limit`() {
        val validPayInvoiceRequest = PayInvoiceRequest(invoice = "lnbc10n1p3xnhl2pp5...")

        assertFailsWith<RequestValidationException> { validPayInvoiceRequest.copy(exchangeRateCurrency = "x".repeat(11)) }
    }
}
