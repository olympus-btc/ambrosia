package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureFreelanceInvoices
import pos.ambrosia.api.handler
import pos.ambrosia.models.FreelanceInvoicePreviewResponse
import pos.ambrosia.models.FreelanceInvoiceResponse
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermissions
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class FreelanceInvoiceRoutesTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `freelance invoice routes require matching permissions`() =
        testApplication {
            val authWithoutPermission = installNonAdminAuth("invoice-no-permission", "invoice-no-permission-user")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            assertEquals(HttpStatusCode.Unauthorized, client.get("/freelance/invoices").status)
            assertEquals(
                HttpStatusCode.Forbidden,
                client.get("/freelance/invoices") { withAuthCookies(authWithoutPermission) }.status,
            )
        }

    @Test
    fun `post preview returns line items without creating a draft invoice`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("invoice-preview", "invoice-preview-user")
            grantPermissions("invoice-preview", "invoices_create", "invoices_read")
            val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            val previewFreelanceInvoiceResponse =
                client.post("/freelance/invoices/preview") {
                    withAuthCookies(authWithPermission)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "clientId":"${freelanceInvoiceFixture.clientId}",
                            "periodStart":"2026-08-17",
                            "periodEnd":"2026-08-23"
                        }""",
                    )
                }
            val freelanceInvoicePreview =
                Json.decodeFromString<FreelanceInvoicePreviewResponse>(previewFreelanceInvoiceResponse.bodyAsText())
            val listInvoicesResponse = client.get("/freelance/invoices") { withAuthCookies(authWithPermission) }
            val listedFreelanceInvoices = Json.decodeFromString<List<FreelanceInvoiceResponse>>(listInvoicesResponse.bodyAsText())

            assertEquals(HttpStatusCode.OK, previewFreelanceInvoiceResponse.status)
            assertEquals(10_000, freelanceInvoicePreview.totalCents)
            assertEquals(1, freelanceInvoicePreview.lineItems.size)
            assertEquals(emptyList(), listedFreelanceInvoices)
        }

    @Test
    fun `post creates draft freelance invoice and get returns the invoice detail`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("invoice-create-read", "invoice-create-read-user")
            grantPermissions("invoice-create-read", "invoices_create", "invoices_read")
            val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            val createFreelanceInvoiceResponse =
                client.post("/freelance/invoices") {
                    withAuthCookies(authWithPermission)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "clientId":"${freelanceInvoiceFixture.clientId}",
                            "periodStart":"2026-08-17",
                            "periodEnd":"2026-08-23"
                        }""",
                    )
                }
            val createdFreelanceInvoice = Json.decodeFromString<FreelanceInvoiceResponse>(createFreelanceInvoiceResponse.bodyAsText())
            val listInvoicesResponse = client.get("/freelance/invoices") { withAuthCookies(authWithPermission) }
            val listedFreelanceInvoices = Json.decodeFromString<List<FreelanceInvoiceResponse>>(listInvoicesResponse.bodyAsText())
            val getFreelanceInvoiceResponse =
                client.get("/freelance/invoices/${createdFreelanceInvoice.id}") {
                    withAuthCookies(authWithPermission)
                }
            val retrievedFreelanceInvoice = Json.decodeFromString<FreelanceInvoiceResponse>(getFreelanceInvoiceResponse.bodyAsText())

            assertEquals(HttpStatusCode.Created, createFreelanceInvoiceResponse.status)
            assertEquals(HttpStatusCode.OK, listInvoicesResponse.status)
            assertEquals(HttpStatusCode.OK, getFreelanceInvoiceResponse.status)
            assertEquals(createdFreelanceInvoice.id, listedFreelanceInvoices.single().id)
            assertEquals(createdFreelanceInvoice.id, retrievedFreelanceInvoice.id)
            assertEquals(10_000, retrievedFreelanceInvoice.totalCents)
            assertEquals(1, retrievedFreelanceInvoice.lineItems.size)
        }

    @Test
    fun `post pay registers freelance invoice payment`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("invoice-pay", "invoice-pay-user")
            grantPermissions("invoice-pay", "invoices_create", "invoices_pay")
            ExposedTestDb.seedPaymentMethod("Bank Transfer")
            val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            val createFreelanceInvoiceResponse =
                client.post("/freelance/invoices") {
                    withAuthCookies(authWithPermission)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "clientId":"${freelanceInvoiceFixture.clientId}",
                            "periodStart":"2026-08-17",
                            "periodEnd":"2026-08-23"
                        }""",
                    )
                }
            val createdFreelanceInvoice = Json.decodeFromString<FreelanceInvoiceResponse>(createFreelanceInvoiceResponse.bodyAsText())

            val payFreelanceInvoiceResponse =
                client.post("/freelance/invoices/${createdFreelanceInvoice.id}/pay") {
                    withAuthCookies(authWithPermission)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"amountCents":10000,"transactionId":"bank-transfer-1"}""")
                }
            val paidFreelanceInvoice = Json.decodeFromString<FreelanceInvoiceResponse>(payFreelanceInvoiceResponse.bodyAsText())

            assertEquals(HttpStatusCode.OK, payFreelanceInvoiceResponse.status)
            assertEquals("paid", paidFreelanceInvoice.status)
        }

    @Test
    fun `missing freelance invoice returns not found`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("invoice-read", "invoice-read-user")
            grantPermissions("invoice-read", "invoices_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            val missingFreelanceInvoiceResponse =
                client.get("/freelance/invoices/00000000-0000-0000-0000-000000000000") {
                    withAuthCookies(authWithPermission)
                }

            assertEquals(HttpStatusCode.NotFound, missingFreelanceInvoiceResponse.status)
        }

    @Test
    fun `invalid freelance invoice payload returns bad request`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("invoice-create", "invoice-create-user")
            grantPermissions("invoice-create", "invoices_create")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceInvoices()
            }

            val invalidFreelanceInvoiceResponse =
                client.post("/freelance/invoices") {
                    withAuthCookies(authWithPermission)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"clientId":"not-a-uuid"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, invalidFreelanceInvoiceResponse.status)
        }

    private fun createFreelanceInvoiceFixture(): FreelanceInvoiceRouteFixture {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = currencyId)
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, payoutAccountId = payoutAccountId)
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 10_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)
        return FreelanceInvoiceRouteFixture(clientId = clientId)
    }

    private data class FreelanceInvoiceRouteFixture(
        val clientId: String,
    )
}
