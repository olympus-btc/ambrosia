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
import pos.ambrosia.api.orders
import pos.ambrosia.services.OrderService
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

class OrdersRoutesTest {
    @Test
    fun `listing orders returns the seeded orders`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            ExposedTestDb.seedOrder(userId, status = "open")

            val response = client.get("/orders") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("open"))
        }

    @Test
    fun `getting an order by id returns it`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId, total = 12.5)

            val response = client.get("/orders/$orderId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("12.5"))
        }

    @Test
    fun `getting an unknown order is a not found`() =
        ordersTest { auth ->
            val response =
                client.get("/orders/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `the complete order view includes its dishes`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)

            val response = client.get("/orders/$orderId/complete") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("dishes"))
        }

    @Test
    fun `filtering by status returns matching orders`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            ExposedTestDb.seedOrder(userId, status = "closed", total = 99.0)

            val response = client.get("/orders/status/closed") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("99"))
        }

    @Test
    fun `filtering by user returns that user's orders`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            ExposedTestDb.seedOrder(userId, total = 77.0)

            val response = client.get("/orders/user/$userId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("77"))
        }

    @Test
    fun `a date range needs both query parameters`() =
        ordersTest { auth ->
            val response = client.get("/orders/date-range?start_date=2024-01-01") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `a date range returns the orders inside it`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            ExposedTestDb.seedOrder(userId, createdAt = "2024-06-15T10:00:00", total = 55.0)

            val response =
                client.get("/orders/date-range?start_date=2024-06-01&end_date=2024-06-30") {
                    withAuthCookies(auth)
                }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("55"))
        }

    @Test
    fun `creating an order returns its new id`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")

            val response =
                client.post("/orders") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"userId":"$userId","status":"open","total":10.0,"createdAt":"2024-01-01T00:00:00"}""",
                    )
                }

            assertEquals(HttpStatusCode.Created, response.status)
            assertTrue(response.bodyAsText().contains("id"))
        }

    @Test
    fun `creating an order with dishes succeeds`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")

            val response =
                client.post("/orders/with-dishes") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{
                            "order":{"userId":"$userId","status":"open","total":0.0,"createdAt":"2024-01-01T00:00:00"},
                            "dishes":[]
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.Created, response.status)
        }

    @Test
    fun `updating an order succeeds`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)

            val response =
                client.put("/orders/$orderId") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"userId":"$userId","status":"closed","total":42.0,"createdAt":"2024-01-01T00:00:00"}""",
                    )
                }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `updating an unknown order is a not found`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")

            val response =
                client.put("/orders/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"userId":"$userId","status":"closed","total":42.0,"createdAt":"2024-01-01T00:00:00"}""",
                    )
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `deleting an order succeeds and then reports not found`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)

            val deleteResponse = client.delete("/orders/$orderId") { withAuthCookies(auth) }
            val getResponse = client.get("/orders/$orderId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NoContent, deleteResponse.status)
            assertEquals(HttpStatusCode.NotFound, getResponse.status)
        }

    @Test
    fun `deleting an unknown order is a not found`() =
        ordersTest { auth ->
            val response =
                client.delete("/orders/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `dishes can be added to an order and then listed`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Paella", price = 18.0)

            val addResponse =
                client.post("/orders/$orderId/dishes") {
                    withAuthCookies(auth)
                    jsonBody("""[{"dishId":"$dishId","priceAtOrder":18.0,"notes":"no salt"}]""")
                }
            val listResponse = client.get("/orders/$orderId/dishes") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Created, addResponse.status)
            assertEquals(HttpStatusCode.OK, listResponse.status)
            assertTrue(listResponse.bodyAsText().contains("no salt"))
        }

    @Test
    fun `adding an empty dish list is a bad request`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)

            val response =
                client.post("/orders/$orderId/dishes") {
                    withAuthCookies(auth)
                    jsonBody("[]")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `an order dish can be updated`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Paella")
            val orderDishId = ExposedTestDb.seedOrderDish(orderId, dishId)

            val response =
                client.put("/orders/$orderId/dishes/$orderDishId") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{
                            "orderId":"$orderId","dishId":"$dishId","priceAtOrder":22.0,
                            "status":"served","shouldPrepare":false
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `updating an unknown order dish is a not found`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Paella")

            val response =
                client.put("/orders/$orderId/dishes/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{
                            "orderId":"$orderId","dishId":"$dishId","priceAtOrder":22.0,
                            "status":"served","shouldPrepare":false
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `a single order dish can be removed`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Paella")
            val orderDishId = ExposedTestDb.seedOrderDish(orderId, dishId)

            val response =
                client.delete("/orders/$orderId/dishes/$orderDishId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NoContent, response.status)
        }

    @Test
    fun `all dishes can be removed from an order`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Paella")
            ExposedTestDb.seedOrderDish(orderId, dishId)

            val response = client.delete("/orders/$orderId/dishes") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NoContent, response.status)
        }

    @Test
    fun `recalculating the total sums the order dishes`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId, total = 0.0)
            val dishId = ExposedTestDb.seedDish("Paella")
            ExposedTestDb.seedOrderDish(orderId, dishId, priceAtOrder = 12.0)
            ExposedTestDb.seedOrderDish(orderId, dishId, priceAtOrder = 8.0)

            val response = client.put("/orders/$orderId/calculate-total") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("20"))
        }

    @Test
    fun `filtering by table returns that table's orders`() =
        ordersTest { auth ->
            val userId = ExposedTestDb.seedUser("waiter")
            val tableId = ExposedTestDb.seedDiningTable()
            ExposedTestDb.seedOrder(userId, tableId = tableId, total = 31.0)

            val response = client.get("/orders/table/$tableId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("31"))
        }

    @Test
    fun `each verb needs its own orders permission`() =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, "orders_read")
            mountOrders()
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)

            val readResponse = client.get("/orders/$orderId") { withAuthCookies(auth) }
            val createResponse =
                client.post("/orders") {
                    withAuthCookies(auth)
                    jsonBody(
                        """{"userId":"$userId","status":"open","total":10.0,"createdAt":"2024-01-01T00:00:00"}""",
                    )
                }
            val deleteResponse = client.delete("/orders/$orderId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, readResponse.status)
            assertEquals(HttpStatusCode.Forbidden, createResponse.status)
            assertEquals(HttpStatusCode.Forbidden, deleteResponse.status)
        }

    @Test
    fun `orders are unreachable without an access token`() =
        ordersTest {
            val response = client.get("/orders")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    private fun ApplicationTestBuilder.mountOrders() {
        installRoutes {
            routing { route("/orders") { orders(OrderService()) } }
        }
    }

    private fun ordersTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, "orders_read", "orders_create", "orders_update", "orders_delete")
            mountOrders()
            block(auth)
        }
}
