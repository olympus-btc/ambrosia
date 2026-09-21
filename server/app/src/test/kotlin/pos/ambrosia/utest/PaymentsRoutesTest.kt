package pos.ambrosia.utest

import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import pos.ambrosia.api.payments
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.TicketPaymentService
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermissions
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.installRoutes
import pos.ambrosia.utils.jsonBody
import pos.ambrosia.utils.routeTest
import pos.ambrosia.utils.withAuthCookies
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private const val ROLE_NAME = "admin-test-role"

class PaymentsRoutesTest {
    @Test
    fun `listing payments returns the seeded payments`() =
        paymentsTest { auth ->
            ExposedTestDb.seedPayment(amount = 33.0)

            val response = client.get("/payments") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("33"))
        }

    @Test
    fun `getting a payment by id returns it`() =
        paymentsTest { auth ->
            val paymentId = ExposedTestDb.seedPayment(amount = 21.0)

            val response = client.get("/payments/$paymentId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("21"))
        }

    @Test
    fun `getting an unknown payment is a not found`() =
        paymentsTest { auth ->
            val response =
                client.get("/payments/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `listing payment methods returns the seeded methods`() =
        paymentsTest { auth ->
            ExposedTestDb.seedPaymentMethod("Lightning")

            val response = client.get("/payments/methods") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("Lightning"))
        }

    @Test
    fun `getting an unknown payment method is a not found`() =
        paymentsTest { auth ->
            val response =
                client.get("/payments/methods/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `listing currencies returns the seeded currencies`() =
        paymentsTest { auth ->
            ExposedTestDb.seedCurrency("EUR")

            val response = client.get("/payments/currencies") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("EUR"))
        }

    @Test
    fun `getting a currency by id returns it`() =
        paymentsTest { auth ->
            val currencyId = ExposedTestDb.seedCurrency("GBP")

            val response = client.get("/payments/currencies/$currencyId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("GBP"))
        }

    @Test
    fun `creating a payment returns its new id`() =
        paymentsTest { auth ->
            val methodId = ExposedTestDb.seedPaymentMethod()
            val currencyId = ExposedTestDb.seedCurrency("USD")

            val response =
                client.post("/payments") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"methodId":"$methodId","currencyId":"$currencyId","transactionId":"txn-9","amount":15.0}""",
                    )
                }

            assertEquals(HttpStatusCode.Created, response.status)
            assertTrue(response.bodyAsText().contains("id"))
        }

    @Test
    fun `updating a payment succeeds`() =
        paymentsTest { auth ->
            val methodId = ExposedTestDb.seedPaymentMethod()
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId, currencyId)

            val response =
                client.put("/payments/$paymentId") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"methodId":"$methodId","currencyId":"$currencyId","transactionId":"txn-9","amount":50.0}""",
                    )
                }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `updating an unknown payment is a not found`() =
        paymentsTest { auth ->
            val methodId = ExposedTestDb.seedPaymentMethod()
            val currencyId = ExposedTestDb.seedCurrency("USD")

            val response =
                client.put("/payments/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"methodId":"$methodId","currencyId":"$currencyId","transactionId":"txn-9","amount":50.0}""",
                    )
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `deleting a payment succeeds and then reports not found`() =
        paymentsTest { auth ->
            val paymentId = ExposedTestDb.seedPayment()

            val deleteResponse = client.delete("/payments/$paymentId") { withAuthCookies(auth) }
            val getResponse = client.get("/payments/$paymentId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NoContent, deleteResponse.status)
            assertEquals(HttpStatusCode.NotFound, getResponse.status)
        }

    @Test
    fun `deleting a ticket payment link needs both query parameters`() =
        paymentsTest { auth ->
            val response = client.delete("/payments/ticket-payments?paymentId=abc") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `ticket payments can be listed by ticket`() =
        paymentsTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId = ExposedTestDb.seedPayment(amount = 12.0)
            ExposedTestDb.seedTicketPayment(paymentId, ticketId)

            val response =
                client.get("/payments/ticket-payments/by-ticket/$ticketId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains(paymentId))
        }

    @Test
    fun `ticket payments can be listed by payment`() =
        paymentsTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId = ExposedTestDb.seedPayment(amount = 12.0)
            ExposedTestDb.seedTicketPayment(paymentId, ticketId)

            val response =
                client.get("/payments/ticket-payments/by-payment/$paymentId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains(ticketId))
        }

    @Test
    fun `payments_read does not grant write access`() =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, "payments_read")
            mountPayments()
            val methodId = ExposedTestDb.seedPaymentMethod()
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId, currencyId)

            val readResponse = client.get("/payments/$paymentId") { withAuthCookies(auth) }
            val createResponse =
                client.post("/payments") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"methodId":"$methodId","currencyId":"$currencyId","transactionId":"t","amount":1.0}""",
                    )
                }
            val deleteResponse = client.delete("/payments/$paymentId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, readResponse.status)
            assertEquals(HttpStatusCode.Forbidden, createResponse.status)
            assertEquals(HttpStatusCode.Forbidden, deleteResponse.status)
        }

    @Test
    fun `payments are unreachable without an access token`() =
        paymentsTest {
            val response = client.get("/payments")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    private fun ApplicationTestBuilder.mountPayments() {
        installRoutes {
            routing { route("/payments") { payments(PaymentService(), TicketPaymentService()) } }
        }
    }

    private fun paymentsTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(
                ROLE_NAME,
                "payments_read",
                "payments_create",
                "payments_update",
                "payments_delete",
            )
            mountPayments()
            block(auth)
        }
}
