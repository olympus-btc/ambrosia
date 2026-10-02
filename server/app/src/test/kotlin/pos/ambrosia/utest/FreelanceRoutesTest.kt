package pos.ambrosia.utest

import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureClients
import pos.ambrosia.api.configurePayoutAccounts
import pos.ambrosia.api.configureProjects
import pos.ambrosia.api.configureTasks
import pos.ambrosia.api.handler
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class FreelanceRoutesTest {
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
    fun `client routes create list get update and soft delete clients`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", clientPermissions)
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureClients()
            }

            val createClientResponse =
                client.post("/freelance/clients") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name":"Acme",
                            "currencyId":"$currencyId",
                            "hourlyRateCents":7500,
                            "billingCycle":"monthly",
                            "paymentMethod":"bank"
                        }""",
                    )
                }
            val listClientsResponse = client.get("/freelance/clients") { withAuthCookies(authCookies) }
            val getClientResponse = client.get("/freelance/clients/$clientId") { withAuthCookies(authCookies) }
            val updateClientResponse =
                client.put("/freelance/clients/$clientId") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name":"Updated",
                            "currencyId":"$currencyId",
                            "hourlyRateCents":9000,
                            "billingCycle":"weekly",
                            "paymentMethod":"lightning"
                        }""",
                    )
                }
            val deleteClientResponse = client.delete("/freelance/clients/$clientId") { withAuthCookies(authCookies) }
            val getDeletedClientResponse = client.get("/freelance/clients/$clientId") { withAuthCookies(authCookies) }

            assertEquals(HttpStatusCode.Created, createClientResponse.status)
            assertEquals(HttpStatusCode.OK, listClientsResponse.status)
            assertEquals(HttpStatusCode.OK, getClientResponse.status)
            assertEquals(HttpStatusCode.OK, updateClientResponse.status)
            assertEquals(HttpStatusCode.NoContent, deleteClientResponse.status)
            assertEquals(HttpStatusCode.NotFound, getDeletedClientResponse.status)
        }

    @Test
    fun `client project routes create and list projects under a client`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", clientPermissions + projectPermissions)
            val clientId = ExposedTestDb.seedFreelanceClient()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureClients()
            }

            val createProjectResponse =
                client.post("/freelance/clients/$clientId/projects") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name":"Website",
                            "status":"in_progress",
                            "hourlyRateCents":8000,
                            "isBillable":true
                        }""",
                    )
                }
            val listProjectsResponse = client.get("/freelance/clients/$clientId/projects") { withAuthCookies(authCookies) }
            val missingClientProjectsResponse =
                client.get("/freelance/clients/00000000-0000-0000-0000-000000000000/projects") {
                    withAuthCookies(authCookies)
                }

            assertEquals(HttpStatusCode.Created, createProjectResponse.status)
            assertEquals(HttpStatusCode.OK, listProjectsResponse.status)
            assertEquals(HttpStatusCode.NotFound, missingClientProjectsResponse.status)
        }

    @Test
    fun `project routes get update and soft delete projects`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", projectPermissions)
            val projectId = ExposedTestDb.seedFreelanceProject()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureProjects()
            }

            val getProjectResponse = client.get("/freelance/projects/$projectId") { withAuthCookies(authCookies) }
            val listProjectsResponse = client.get("/freelance/projects") { withAuthCookies(authCookies) }
            val updateProjectResponse =
                client.put("/freelance/projects/$projectId") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name":"Updated",
                            "status":"done",
                            "hourlyRateCents":8500,
                            "isBillable":false
                        }""",
                    )
                }
            val deleteProjectResponse = client.delete("/freelance/projects/$projectId") { withAuthCookies(authCookies) }
            val getDeletedProjectResponse = client.get("/freelance/projects/$projectId") { withAuthCookies(authCookies) }

            assertEquals(HttpStatusCode.OK, getProjectResponse.status)
            assertEquals(HttpStatusCode.OK, listProjectsResponse.status)
            assertEquals(HttpStatusCode.OK, updateProjectResponse.status)
            assertEquals(HttpStatusCode.NoContent, deleteProjectResponse.status)
            assertEquals(HttpStatusCode.NotFound, getDeletedProjectResponse.status)
        }

    @Test
    fun `payout account routes create list get update and soft delete payout accounts`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", payoutAccountPermissions)
            val currencyId = ExposedTestDb.seedCurrency("USD")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configurePayoutAccounts()
            }

            val createPayoutAccountResponse =
                client.post("/freelance/payout-accounts") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "type":"bank",
                            "accountHolder":"Jane Doe",
                            "bankName":"Acme Bank",
                            "accountNumber":"1234567890",
                            "currencyId":"$currencyId"
                        }""",
                    )
                }
            val createdPayoutAccountId =
                Json
                    .parseToJsonElement(createPayoutAccountResponse.bodyAsText())
                    .jsonObject["id"]!!
                    .jsonPrimitive.content
            val listPayoutAccountsResponse = client.get("/freelance/payout-accounts") { withAuthCookies(authCookies) }
            val getPayoutAccountResponse =
                client.get("/freelance/payout-accounts/$createdPayoutAccountId") { withAuthCookies(authCookies) }
            val updatePayoutAccountResponse =
                client.put("/freelance/payout-accounts/$createdPayoutAccountId") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "type":"lightning",
                            "lightningAddress":"freelancer@getalby.com"
                        }""",
                    )
                }
            val deletePayoutAccountResponse =
                client.delete("/freelance/payout-accounts/$createdPayoutAccountId") { withAuthCookies(authCookies) }
            val getDeletedPayoutAccountResponse =
                client.get("/freelance/payout-accounts/$createdPayoutAccountId") { withAuthCookies(authCookies) }

            assertEquals(HttpStatusCode.Created, createPayoutAccountResponse.status)
            assertEquals(HttpStatusCode.OK, listPayoutAccountsResponse.status)
            assertEquals(HttpStatusCode.OK, getPayoutAccountResponse.status)
            assertEquals(HttpStatusCode.OK, updatePayoutAccountResponse.status)
            assertEquals(HttpStatusCode.NoContent, deletePayoutAccountResponse.status)
            assertEquals(HttpStatusCode.NotFound, getDeletedPayoutAccountResponse.status)
        }

    @Test
    fun `payout account routes reject invalid bank and lightning payloads`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", payoutAccountPermissions)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configurePayoutAccounts()
            }

            val invalidBankResponse =
                client.post("/freelance/payout-accounts") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"type":"bank","accountHolder":"Jane Doe"}""")
                }
            val invalidLightningResponse =
                client.post("/freelance/payout-accounts") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"type":"lightning","bankName":"Acme Bank","lightningAddress":"freelancer@getalby.com"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, invalidBankResponse.status)
            assertEquals(HttpStatusCode.BadRequest, invalidLightningResponse.status)
        }

    @Test
    fun `task routes create list get update and soft delete tasks`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantFreelancePermissions("admin-test-role", taskPermissions)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTasks()
            }

            val createTaskResponse =
                client.post("/freelance/tasks") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name": "Development",
                            "isBillable": true
                        }""",
                    )
                }
            val taskId =
                Json
                    .parseToJsonElement(createTaskResponse.bodyAsText())
                    .jsonObject["id"]!!
                    .jsonPrimitive.content
            val listTasksResponse = client.get("/freelance/tasks") { withAuthCookies(authCookies) }
            val getTaskResponse = client.get("/freelance/tasks/$taskId") { withAuthCookies(authCookies) }
            val updateTaskResponse =
                client.put("/freelance/tasks/$taskId") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "name": "Design",
                            "isBillable": false
                        }""",
                    )
                }
            val deleteTaskResponse = client.delete("/freelance/tasks/$taskId") { withAuthCookies(authCookies) }
            val getDeletedTaskResponse = client.get("/freelance/tasks/$taskId") { withAuthCookies(authCookies) }

            assertEquals(HttpStatusCode.Created, createTaskResponse.status)
            assertEquals(HttpStatusCode.OK, listTasksResponse.status)
            assertEquals(HttpStatusCode.OK, getTaskResponse.status)
            assertEquals(HttpStatusCode.OK, updateTaskResponse.status)
            assertEquals(HttpStatusCode.NoContent, deleteTaskResponse.status)
            assertEquals(HttpStatusCode.NotFound, getDeletedTaskResponse.status)
        }

    @Test
    fun `freelance routes require matching permissions`() =
        testApplication {
            val authCookies = installAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureClients()
                configureProjects()
            }
            val projectId = ExposedTestDb.seedFreelanceProject()

            assertEquals(HttpStatusCode.Forbidden, client.get("/freelance/clients") { withAuthCookies(authCookies) }.status)
            assertEquals(HttpStatusCode.Forbidden, client.get("/freelance/projects") { withAuthCookies(authCookies) }.status)
            assertEquals(
                HttpStatusCode.Forbidden,
                client.get("/freelance/projects/$projectId") { withAuthCookies(authCookies) }.status,
            )
        }

    private fun grantFreelancePermissions(
        roleName: String,
        permissions: List<String>,
    ) {
        val roleId = ExposedTestDb.seedRole(roleName, isAdmin = true)
        permissions.forEach { permissionName -> ExposedTestDb.seedPermission(permissionName) }
        PermissionsService().replaceRolePermissions(roleId, permissions)
    }

    private companion object {
        val clientPermissions =
            listOf(
                "clients_read",
                "clients_create",
                "clients_update",
                "clients_delete",
            )
        val projectPermissions =
            listOf(
                "projects_read",
                "projects_create",
                "projects_update",
                "projects_delete",
            )
        val payoutAccountPermissions =
            listOf(
                "payout_accounts_read",
                "payout_accounts_create",
                "payout_accounts_update",
                "payout_accounts_delete",
            )
        val taskPermissions =
            listOf(
                "tasks_read",
                "tasks_create",
                "tasks_update",
                "tasks_delete",
            )
    }
}
