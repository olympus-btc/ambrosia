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
import pos.ambrosia.api.productVariants
import pos.ambrosia.api.products
import pos.ambrosia.services.ProductService
import pos.ambrosia.services.ProductVariantService
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

class ProductsRoutesTest {
    @Test
    fun `listing products returns the seeded products`() =
        productsTest { auth ->
            ExposedTestDb.seedProduct("Espresso")

            val response = client.get("/products") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("Espresso"))
        }

    @Test
    fun `getting a product by id returns it`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Latte")

            val response = client.get("/products/$productId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("Latte"))
        }

    @Test
    fun `getting an unknown product is a not found`() =
        productsTest { auth ->
            val response =
                client.get("/products/00000000-0000-0000-0000-000000000000") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `creating a product returns its new id`() =
        productsTest { auth ->
            val response =
                client.post("/products") {
                    withAuthCookies(auth)
                    jsonBody("""{"name":"Cortado","priceCents":250,"quantity":10}""")
                }

            assertEquals(HttpStatusCode.Created, response.status)
            assertTrue(response.bodyAsText().contains("id"))
        }

    @Test
    fun `updating a product succeeds`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Mocha")

            val response =
                client.put("/products/$productId") {
                    withAuthCookies(auth)
                    jsonBody("""{"name":"Mocha Grande","priceCents":400,"quantity":5}""")
                }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `updating an unknown product is a not found`() =
        productsTest { auth ->
            val response =
                client.put("/products/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                    jsonBody("""{"name":"Ghost","priceCents":100,"quantity":1}""")
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `deleting a product succeeds and then reports not found`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Doomed")

            val deleteResponse = client.delete("/products/$productId") { withAuthCookies(auth) }
            val getResponse = client.get("/products/$productId") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.NoContent, deleteResponse.status)
            assertEquals(HttpStatusCode.NotFound, getResponse.status)
        }

    @Test
    fun `an empty stock adjustment list is a bad request`() =
        productsTest { auth ->
            val response =
                client.post("/products/stock") {
                    withAuthCookies(auth)
                    jsonBody("[]")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `a stock adjustment beyond the available quantity is rejected`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Scarce", quantity = 2)

            val response =
                client.post("/products/stock") {
                    withAuthCookies(auth)
                    jsonBody("""[{"productId":"$productId","quantity":99}]""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `a negative stock adjustment is rejected`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Scarce", quantity = 5)

            val response =
                client.post("/products/stock") {
                    withAuthCookies(auth)
                    jsonBody("""[{"productId":"$productId","quantity":-1}]""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `stock adjustment is guarded by orders_create rather than products_update`() =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(ROLE_NAME, "products_read", "products_update")
            mountProducts()
            val productId = ExposedTestDb.seedProduct("Guarded", quantity = 10)

            val withoutOrdersCreate =
                client.post("/products/stock") {
                    withAuthCookies(auth)
                    jsonBody("""[{"productId":"$productId","quantity":1}]""")
                }

            assertEquals(HttpStatusCode.Forbidden, withoutOrdersCreate.status)
        }

    @Test
    fun `stock adjustment succeeds with orders_create`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Stocked", quantity = 10)

            val response =
                client.post("/products/stock") {
                    withAuthCookies(auth)
                    jsonBody("""[{"productId":"$productId","quantity":1}]""")
                }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `listing variants of a product succeeds`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Varied", hasVariants = true)

            val response = client.get("/products/$productId/variants") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `an option type can be created and then listed`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Sized", hasVariants = true)

            val createResponse =
                client.post("/products/$productId/options") {
                    withAuthCookies(auth)
                    jsonBody("""{"name":"Size","values":[{"value":"Small"},{"value":"Large"}]}""")
                }
            val listResponse = client.get("/products/$productId/options") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Created, createResponse.status)
            assertTrue(listResponse.bodyAsText().contains("Size"))
        }

    @Test
    fun `deleting an unknown option type is a not found`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Sized", hasVariants = true)

            val response =
                client.delete("/products/$productId/options/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `a variant can be created and then updated`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Varied", hasVariants = true)

            val createResponse =
                client.post("/products/$productId/variants") {
                    withAuthCookies(auth)
                    jsonBody("""{"priceCents":300,"quantity":4}""")
                }
            val variantId = Regex("\"id\":\"([^\"]+)\"").find(createResponse.bodyAsText())?.groupValues?.get(1)
            val updateResponse =
                client.put("/products/$productId/variants/$variantId") {
                    withAuthCookies(auth)
                    jsonBody("""{"priceCents":350,"quantity":6}""")
                }

            assertEquals(HttpStatusCode.Created, createResponse.status)
            assertEquals(HttpStatusCode.OK, updateResponse.status)
        }

    @Test
    fun `deleting an unknown variant is a not found`() =
        productsTest { auth ->
            val productId = ExposedTestDb.seedProduct("Varied", hasVariants = true)

            val response =
                client.delete("/products/$productId/variants/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(auth)
                }

            assertEquals(HttpStatusCode.NotFound, response.status)
        }

    @Test
    fun `products are unreachable without an access token`() =
        productsTest {
            val response = client.get("/products")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    private fun ApplicationTestBuilder.mountProducts() {
        installRoutes {
            routing {
                route("/products") { products(ProductService(), ProductVariantService()) }
                route("/products/{id}") { productVariants(ProductVariantService()) }
            }
        }
    }

    private fun productsTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            val auth = installAdminAuth()
            grantPermissions(
                ROLE_NAME,
                "products_read",
                "products_create",
                "products_update",
                "products_delete",
                "orders_create",
            )
            mountProducts()
            block(auth)
        }
}
