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
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureTimeEntries
import pos.ambrosia.api.handler
import pos.ambrosia.db.tables.TimeEntryEntity
import pos.ambrosia.models.TimeEntryResponse
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.grantPermissions
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TimeEntriesRouteTest {
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
    fun `routes require authentication and the matching permission`() =
        testApplication {
            val auth = installNonAdminAuth("time-no-permission", "time-no-permission-user")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            assertEquals(
                HttpStatusCode.Unauthorized,
                client.get("/freelance/time-entries?from=2026-08-17&to=2026-08-23").status,
            )
            assertEquals(HttpStatusCode.Unauthorized, client.post("/freelance/time-entries").status)
            assertEquals(HttpStatusCode.Unauthorized, client.put("/freelance/time-entries/${UUID.randomUUID()}").status)
            assertEquals(HttpStatusCode.Unauthorized, client.delete("/freelance/time-entries/${UUID.randomUUID()}").status)

            assertEquals(
                HttpStatusCode.Forbidden,
                client
                    .get("/freelance/time-entries?from=2026-08-17&to=2026-08-23") {
                        withAuthCookies(auth)
                    }.status,
            )
            assertEquals(
                HttpStatusCode.Forbidden,
                client.post("/freelance/time-entries") { withAuthCookies(auth) }.status,
            )
            assertEquals(
                HttpStatusCode.Forbidden,
                client.put("/freelance/time-entries/${UUID.randomUUID()}") { withAuthCookies(auth) }.status,
            )
            assertEquals(
                HttpStatusCode.Forbidden,
                client.delete("/freelance/time-entries/${UUID.randomUUID()}") { withAuthCookies(auth) }.status,
            )
        }

    @Test
    fun `post returns an enriched entry`() =
        testApplication {
            val auth = installNonAdminAuth("time-create-role", "time-create-user")
            grantPermission("time-create-role", "time_entries_create")
            val fixture = seedFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val response =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(fixture.projectId, fixture.taskId))
                }

            assertEquals(HttpStatusCode.Created, response.status)
            val body = Json.decodeFromString<TimeEntryResponse>(response.bodyAsText())
            assertEquals("Project Alpha", body.projectName)
            assertEquals("Development", body.taskName)
        }

    @Test
    fun `post resolves an existing task by name and rejects a new name without the tasks create permission`() =
        testApplication {
            val nonAdminAuth = installNonAdminAuth("time-task-name-role", "time-task-name-user")
            grantPermission("time-task-name-role", "time_entries_create")
            val timeEntryFixture = seedFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val existingTaskResponse =
                client.post("/freelance/time-entries") {
                    withAuthCookies(nonAdminAuth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBodyByTaskName(timeEntryFixture.projectId, "development"))
                }
            assertEquals(HttpStatusCode.Created, existingTaskResponse.status)
            assertEquals(timeEntryFixture.taskId, Json.decodeFromString<TimeEntryResponse>(existingTaskResponse.bodyAsText()).taskId)

            val newTaskResponse =
                client.post("/freelance/time-entries") {
                    withAuthCookies(nonAdminAuth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBodyByTaskName(timeEntryFixture.projectId, "Code review"))
                }
            assertEquals(HttpStatusCode.Forbidden, newTaskResponse.status)
        }

    @Test
    fun `post creates the task from the task name with the tasks create permission`() =
        testApplication {
            val nonAdminAuth = installNonAdminAuth("time-task-create-role", "time-task-create-user")
            grantPermissions("time-task-create-role", "time_entries_create", "tasks_create")
            val timeEntryFixture = seedFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val createTimeEntryResponse =
                client.post("/freelance/time-entries") {
                    withAuthCookies(nonAdminAuth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBodyByTaskName(timeEntryFixture.projectId, "Code review"))
                }

            assertEquals(HttpStatusCode.Created, createTimeEntryResponse.status)
            assertEquals("Code review", Json.decodeFromString<TimeEntryResponse>(createTimeEntryResponse.bodyAsText()).taskName)
        }

    @Test
    fun `get requires from and to and returns weekly entries`() =
        testApplication {
            val auth = installNonAdminAuth("time-read-role", "time-read-user")
            grantPermission("time-read-role", "time_entries_read")
            val fixture = seedFixture()
            ExposedTestDb.seedTimeEntry(fixture.projectId, fixture.taskId, "2026-08-19")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            assertEquals(
                HttpStatusCode.BadRequest,
                client.get("/freelance/time-entries?from=2026-08-17") { withAuthCookies(auth) }.status,
            )
            val response =
                client.get("/freelance/time-entries?from=2026-08-17&to=2026-08-23") {
                    withAuthCookies(auth)
                }
            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(1, Json.decodeFromString<List<TimeEntryResponse>>(response.bodyAsText()).size)
        }

    @Test
    fun `put rejects an invoice linked entry with conflict`() =
        testApplication {
            val auth = installNonAdminAuth("time-update-role", "time-update-user")
            grantPermission("time-update-role", "time_entries_update")
            val fixture = seedFixture()
            val invoiceId = ExposedTestDb.seedInvoice(fixture.clientId, fixture.currencyId)
            val entryId =
                ExposedTestDb.seedTimeEntry(fixture.projectId, fixture.taskId, invoiceId = invoiceId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val response =
                client.put("/freelance/time-entries/$entryId") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(fixture.projectId, fixture.taskId))
                }

            assertEquals(HttpStatusCode.Conflict, response.status)
        }

    @Test
    fun `delete removes an unlocked entry and rejects a locked entry`() =
        testApplication {
            val auth = installNonAdminAuth("time-delete-role", "time-delete-user")
            grantPermission("time-delete-role", "time_entries_delete")
            val fixture = seedFixture()
            val unlockedId = ExposedTestDb.seedTimeEntry(fixture.projectId, fixture.taskId)
            val lockedId = ExposedTestDb.seedTimeEntry(fixture.projectId, fixture.taskId, isLocked = true)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            assertEquals(
                HttpStatusCode.NoContent,
                client.delete("/freelance/time-entries/$unlockedId") { withAuthCookies(auth) }.status,
            )
            assertEquals(
                HttpStatusCode.Conflict,
                client.delete("/freelance/time-entries/$lockedId") { withAuthCookies(auth) }.status,
            )
        }

    @Test
    fun `malformed id and invalid request return bad request`() =
        testApplication {
            val auth = installNonAdminAuth("time-invalid-role", "time-invalid-user")
            grantPermissions("time-invalid-role", "time_entries_read", "time_entries_create")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            assertEquals(
                HttpStatusCode.BadRequest,
                client.get("/freelance/time-entries/not-a-uuid") { withAuthCookies(auth) }.status,
            )
            assertEquals(
                HttpStatusCode.BadRequest,
                client.get("/freelance/time-entries?from=2026-08-24&to=2026-08-17") { withAuthCookies(auth) }.status,
            )
            val malformedBodyResponse =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("{")
                }
            assertEquals(HttpStatusCode.BadRequest, malformedBodyResponse.status)
        }

    @Test
    fun `routes complete create read update and physical delete`() =
        testApplication {
            val auth = installNonAdminAuth("time-crud-role", "time-crud-user")
            grantPermissions(
                "time-crud-role",
                "time_entries_read",
                "time_entries_create",
                "time_entries_update",
                "time_entries_delete",
            )
            val fixture = seedFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val createdResponse =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(fixture.projectId, fixture.taskId))
                }
            assertEquals(HttpStatusCode.Created, createdResponse.status)
            val created = Json.decodeFromString<TimeEntryResponse>(createdResponse.bodyAsText())

            val getResponse = client.get("/freelance/time-entries/${created.id}") { withAuthCookies(auth) }
            assertEquals(HttpStatusCode.OK, getResponse.status)
            assertEquals(created.id, Json.decodeFromString<TimeEntryResponse>(getResponse.bodyAsText()).id)

            val putResponse =
                client.put("/freelance/time-entries/${created.id}") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        requestBody(
                            fixture.projectId,
                            fixture.taskId,
                            entryDate = "2026-08-20",
                            description = "Updated detail",
                            durationMinutes = 30,
                        ),
                    )
                }
            assertEquals(HttpStatusCode.OK, putResponse.status)
            val updated = Json.decodeFromString<TimeEntryResponse>(putResponse.bodyAsText())
            assertEquals("2026-08-20", updated.entryDate)
            assertEquals("Updated detail", updated.description)
            assertEquals(30, updated.durationMinutes)

            assertEquals(
                HttpStatusCode.NoContent,
                client.delete("/freelance/time-entries/${created.id}") { withAuthCookies(auth) }.status,
            )
            assertEquals(
                HttpStatusCode.NotFound,
                client.get("/freelance/time-entries/${created.id}") { withAuthCookies(auth) }.status,
            )
            transaction {
                assertNull(TimeEntryEntity.findById(UUID.fromString(created.id)))
            }
        }

    @Test
    fun `post returns isBillable false when project is not billable`() =
        testApplication {
            val auth = installNonAdminAuth("time-nb-project-role", "time-nb-project-user")
            grantPermission("time-nb-project-role", "time_entries_create")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val clientId = ExposedTestDb.seedClient("Client NB", currencyId, 10_000)
            val projectId = ExposedTestDb.seedProject(clientId, "Non-Billable Project", 12_000, isBillable = false)
            val taskId = ExposedTestDb.seedTask("Development")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val response =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(projectId, taskId))
                }

            assertEquals(HttpStatusCode.Created, response.status)
            val body = Json.decodeFromString<TimeEntryResponse>(response.bodyAsText())
            assertFalse(body.isBillable)
        }

    @Test
    fun `post returns isBillable false when task is not billable`() =
        testApplication {
            val auth = installNonAdminAuth("time-nb-task-role", "time-nb-task-user")
            grantPermission("time-nb-task-role", "time_entries_create")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val clientId = ExposedTestDb.seedClient("Client BT", currencyId, 10_000)
            val projectId = ExposedTestDb.seedProject(clientId, "Billable Project", 12_000)
            val taskId = ExposedTestDb.seedTask("Internal", isBillable = false)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val response =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(projectId, taskId))
                }

            assertEquals(HttpStatusCode.Created, response.status)
            val body = Json.decodeFromString<TimeEntryResponse>(response.bodyAsText())
            assertFalse(body.isBillable)
        }

    @Test
    fun `post returns isBillable true when both project and task are billable`() =
        testApplication {
            val auth = installNonAdminAuth("time-billable-role", "time-billable-user")
            grantPermission("time-billable-role", "time_entries_create")
            val fixture = seedFixture()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureTimeEntries()
            }

            val response =
                client.post("/freelance/time-entries") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(requestBody(fixture.projectId, fixture.taskId))
                }

            assertEquals(HttpStatusCode.Created, response.status)
            assertTrue(Json.decodeFromString<TimeEntryResponse>(response.bodyAsText()).isBillable)
        }

    private fun seedFixture(): Fixture {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client Alpha", currencyId, 10_000)
        val projectId = ExposedTestDb.seedProject(clientId, "Project Alpha", 12_000)
        val taskId = ExposedTestDb.seedTask("Development")
        return Fixture(currencyId, clientId, projectId, taskId)
    }

    private fun requestBody(
        projectId: String,
        taskId: String,
        entryDate: String = "2026-08-19",
        description: String = "Implemented the API",
        durationMinutes: Int = 15,
    ): String =
        """
        {
            "projectId":"$projectId",
            "taskId":"$taskId",
            "entryDate":"$entryDate",
            "startTime":"09:00",
            "endTime":"10:00",
            "description":"$description",
            "durationMinutes":$durationMinutes
        }
        """.trimIndent()

    private fun requestBodyByTaskName(
        projectId: String,
        taskName: String,
    ): String =
        """
        {
            "projectId":"$projectId",
            "taskName":"$taskName",
            "entryDate":"2026-08-19",
            "durationMinutes":15
        }
        """.trimIndent()

    private data class Fixture(
        val currencyId: String,
        val clientId: String,
        val projectId: String,
        val taskId: String,
    )
}
