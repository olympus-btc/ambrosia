package pos.ambrosia.utest

import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import org.junit.After
import pos.ambrosia.api.checkout
import pos.ambrosia.api.storeOrders
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.RefundService
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.FakeLightningBackend
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

private val allCheckoutPermissions =
    arrayOf("orders_create", "orders_delete", "orders_refund", "orders_discount")

class CheckoutRoutesTest {
    private val backend = FakeLightningBackend()

    @After
    fun tearDown() {
        ActiveLightningBackend.closeActive()
    }

    @Test
    fun `a checkout with no items is rejected`() =
        checkoutTest { auth ->
            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(checkoutBody(items = "[]"))
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("checkout_empty"))
        }

    @Test
    fun `a checkout with a non-positive quantity is rejected`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)

            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(items = """[{"productId":"$productId","quantity":0,"priceAtOrder":200}]"""),
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("checkout_invalid_quantity"))
        }

    @Test
    fun `a cash checkout creates the order ticket and payment`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)

            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]"""),
                    )
                }

            assertEquals(HttpStatusCode.Created, response.status)
            val body = response.bodyAsText()
            assertTrue(body.contains("orderId"))
            assertTrue(body.contains("ticketId"))
            assertTrue(body.contains("paymentId"))
        }

    @Test
    fun `a lightning checkout for an unpaid invoice is left pending`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)
            backend.incomingPaymentIsPaid = false

            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(
                            items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]""",
                            extra = ""","paymentHash":"hash-unpaid"""",
                        ),
                    )
                }

            assertEquals(HttpStatusCode.Accepted, response.status)
            assertTrue(response.bodyAsText().contains("pending"))
        }

    @Test
    fun `replaying a payment hash returns the existing checkout`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)
            val body =
                checkoutBody(
                    items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]""",
                    extra = ""","paymentHash":"hash-paid"""",
                )

            val first =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(body)
                }
            val replay =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(body)
                }

            assertEquals(HttpStatusCode.Created, first.status)
            assertEquals(HttpStatusCode.OK, replay.status)
            assertEquals(orderIdOf(first), orderIdOf(replay))
        }

    @Test
    fun `a discounted checkout needs the orders_discount permission`() =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, "orders_create")
            mountCheckout()
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)

            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(
                            items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]""",
                            extra = ""","discountAmount":1.5""",
                        ),
                    )
                }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `a discounted checkout succeeds with the orders_discount permission`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)

            val response =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(
                            items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]""",
                            extra = ""","discountAmount":1.5""",
                        ),
                    )
                }

            assertEquals(HttpStatusCode.Created, response.status)
        }

    @Test
    fun `payment status reports pending for an unknown hash`() =
        checkoutTest { auth ->
            backend.incomingPaymentIsPaid = false

            val response = client.get("/store/orders/payment-status/unknown-hash") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("pending"))
        }

    @Test
    fun `payment status reports paid once the backend settles the invoice`() =
        checkoutTest { auth ->
            val response = client.get("/store/orders/payment-status/settled-hash") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("paid"))
        }

    @Test
    fun `cancelling an unknown store order is a not found`() =
        checkoutTest { auth ->
            val response =
                client.delete("/store/orders/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `cancelling an open store order succeeds`() =
        checkoutTest { auth ->
            val userId = ExposedTestDb.seedUser("cashier")
            val orderId = ExposedTestDb.seedOrder(userId, status = "open")

            val response = client.delete("/store/orders/$orderId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `a completed checkout can no longer be cancelled`() =
        checkoutTest { auth ->
            val productId = ExposedTestDb.seedProduct("Espresso", quantity = 10)
            val checkoutResponse =
                client.post("/store/orders/checkout") {
                    withAuthCookies(auth)
                    jsonBody(
                        checkoutBody(items = """[{"productId":"$productId","quantity":1,"priceAtOrder":200}]"""),
                    )
                }

            val response =
                client.delete("/store/orders/${orderIdOf(checkoutResponse)}") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `an order attached to a table is not a store order`() =
        checkoutTest { auth ->
            val userId = ExposedTestDb.seedUser("cashier")
            val tableId = ExposedTestDb.seedDiningTable()
            val orderId = ExposedTestDb.seedOrder(userId, status = "open", tableId = tableId)

            val response = client.delete("/store/orders/$orderId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `cancelling with a malformed order id is a not found`() =
        checkoutTest { auth ->
            val response = client.delete("/store/orders/not-a-uuid") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `checkout is unreachable without an access token`() =
        checkoutTest {
            val response = client.post("/store/orders/checkout") { jsonBody(checkoutBody(items = "[]")) }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    private suspend fun orderIdOf(response: io.ktor.client.statement.HttpResponse): String =
        Regex("\"orderId\":\"([^\"]+)\"")
            .find(response.bodyAsText())
            ?.groupValues
            ?.get(1)
            .orEmpty()

    private fun checkoutBody(
        items: String,
        extra: String = "",
    ): String {
        val userId = ExposedTestDb.seedUser("cashier")
        val methodId = ExposedTestDb.seedPaymentMethod()
        val currencyId = ExposedTestDb.seedCurrency("USD")
        return """{
            "userId":"$userId",
            "items":$items,
            "paymentMethodId":"$methodId",
            "currencyId":"$currencyId",
            "amount":2.0$extra
        }"""
    }

    private fun ApplicationTestBuilder.mountCheckout() {
        installRoutes {
            routing {
                route("/store/orders") {
                    checkout(CheckoutService(ActiveLightningBackend))
                    storeOrders(CheckoutService(), RefundService(ActiveLightningBackend))
                }
            }
        }
    }

    private fun checkoutTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            ActiveLightningBackend.set(backend)
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, *allCheckoutPermissions)
            mountCheckout()
            block(auth)
        }
}
