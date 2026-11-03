package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.models.FreelanceProjectUpsert
import pos.ambrosia.services.ProjectService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProjectServiceTest {
    private lateinit var databaseFile: File
    private val service = ProjectService()

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `addProject returns id for valid request`() {
        val clientId = ExposedTestDb.seedFreelanceClient()

        val projectId =
            service.addProject(
                clientId,
                FreelanceProjectUpsert(
                    name = "Website",
                    status = "in_progress",
                    hourlyRateCents = 8000,
                    isBillable = true,
                ),
            )

        assertNotNull(projectId)
        val project = service.getProjectById(projectId)
        assertNotNull(project)
        assertEquals(clientId, project.clientId)
        assertEquals("Website", project.name)
        assertEquals(8000, project.hourlyRateCents)
    }

    @Test
    fun `addProject preserves null hourly rate for client inheritance`() {
        val clientId = ExposedTestDb.seedFreelanceClient(hourlyRateCents = 9000)

        val projectId =
            service.addProject(
                clientId,
                FreelanceProjectUpsert(
                    name = "Inherited Rate",
                    hourlyRateCents = null,
                ),
            )

        assertNotNull(projectId)
        assertNull(service.getProjectById(projectId)?.hourlyRateCents)
    }

    @Test
    fun `addProject rejects invalid request values`() {
        val clientId = ExposedTestDb.seedFreelanceClient()
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)
        val validRequest = FreelanceProjectUpsert(name = "Website")

        assertNull(service.addProject("not-a-uuid", validRequest))
        assertNull(service.addProject(UUID.randomUUID().toString(), validRequest))
        assertNull(service.addProject(deletedClientId, validRequest))
        assertNull(service.addProject(clientId, validRequest.copy(name = "  ")))
        assertNull(service.addProject(clientId, validRequest.copy(status = "unknown")))
        assertNull(service.addProject(clientId, validRequest.copy(hourlyRateCents = -1)))
    }

    @Test
    fun `getProjectsByClientId returns active projects for active client`() {
        val clientId = ExposedTestDb.seedFreelanceClient()
        ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "Active")
        ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "Deleted", isDeleted = true)

        val projects = service.getProjectsByClientId(clientId)

        assertNotNull(projects)
        assertEquals(1, projects.size)
        assertEquals("Active", projects[0].name)
    }

    @Test
    fun `getProjects returns active projects for active clients`() {
        val firstClientId = ExposedTestDb.seedFreelanceClient()
        val secondClientId = ExposedTestDb.seedFreelanceClient(name = "Second Client")
        val deletedClientId = ExposedTestDb.seedFreelanceClient(name = "Deleted Client", isDeleted = true)
        ExposedTestDb.seedFreelanceProject(clientId = firstClientId, name = "Website")
        ExposedTestDb.seedFreelanceProject(clientId = secondClientId, name = "Branding")
        ExposedTestDb.seedFreelanceProject(clientId = firstClientId, name = "Deleted Project", isDeleted = true)
        ExposedTestDb.seedFreelanceProject(clientId = deletedClientId, name = "Archived Client Project")

        val projects = service.getProjects(null)

        assertEquals(listOf("Branding", "Website"), projects?.map { project -> project.name }?.sorted())
    }

    @Test
    fun `getProjectsByClientId returns null for invalid missing or deleted client`() {
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)

        assertNull(service.getProjectsByClientId("not-a-uuid"))
        assertNull(service.getProjectsByClientId(UUID.randomUUID().toString()))
        assertNull(service.getProjectsByClientId(deletedClientId))
    }

    @Test
    fun `getProjects returns active projects of active clients filtered by status`() {
        val clientId = ExposedTestDb.seedFreelanceClient()
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)
        ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "In Progress", status = "in_progress")
        ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "Pending", status = "pending")
        ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "Deleted", status = "in_progress", isDeleted = true)
        ExposedTestDb.seedFreelanceProject(clientId = deletedClientId, name = "Orphan", status = "in_progress")

        val inProgressProjects = service.getProjects("in_progress")
        val allProjects = service.getProjects(null)

        assertEquals(listOf("In Progress"), inProgressProjects?.map { project -> project.name })
        assertEquals(setOf("In Progress", "Pending"), allProjects?.map { project -> project.name }?.toSet())
    }

    @Test
    fun `getProjects returns null for an unknown status`() {
        assertNull(service.getProjects("unknown"))
    }

    @Test
    fun `getProjectById returns null for invalid missing deleted or deleted parent client`() {
        val deletedProjectId = ExposedTestDb.seedFreelanceProject(isDeleted = true)
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)
        val orphanedProjectId = ExposedTestDb.seedFreelanceProject(clientId = deletedClientId)

        assertNull(service.getProjectById("not-a-uuid"))
        assertNull(service.getProjectById(UUID.randomUUID().toString()))
        assertNull(service.getProjectById(deletedProjectId))
        assertNull(service.getProjectById(orphanedProjectId))
    }

    @Test
    fun `updateProject updates active project`() {
        val projectId = ExposedTestDb.seedFreelanceProject()

        val projectWasUpdated =
            service.updateProject(
                projectId,
                FreelanceProjectUpsert(
                    name = "Updated",
                    status = "done",
                    hourlyRateCents = 8500,
                    isBillable = false,
                ),
            )

        assertTrue(projectWasUpdated)
        val project = service.getProjectById(projectId)
        assertNotNull(project)
        assertEquals("Updated", project.name)
        assertEquals("done", project.status)
        assertEquals(8500, project.hourlyRateCents)
        assertFalse(project.isBillable)
    }

    @Test
    fun `updateProject returns false for invalid missing deleted or deleted parent project`() {
        val deletedProjectId = ExposedTestDb.seedFreelanceProject(isDeleted = true)
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)
        val orphanedProjectId = ExposedTestDb.seedFreelanceProject(clientId = deletedClientId)
        val validRequest = FreelanceProjectUpsert(name = "Updated")

        assertFalse(service.updateProject("not-a-uuid", validRequest))
        assertFalse(service.updateProject(UUID.randomUUID().toString(), validRequest))
        assertFalse(service.updateProject(deletedProjectId, validRequest))
        assertFalse(service.updateProject(orphanedProjectId, validRequest))
        assertFalse(service.updateProject(orphanedProjectId, validRequest.copy(status = "unknown")))
    }

    @Test
    fun `deleteProject soft deletes project`() {
        val projectId = ExposedTestDb.seedFreelanceProject()

        val projectWasDeleted = service.deleteProject(projectId)

        assertTrue(projectWasDeleted)
        assertNull(service.getProjectById(projectId))
    }

    @Test
    fun `deleteProject returns false for invalid missing or already deleted project`() {
        val deletedProjectId = ExposedTestDb.seedFreelanceProject(isDeleted = true)

        assertFalse(service.deleteProject("not-a-uuid"))
        assertFalse(service.deleteProject(UUID.randomUUID().toString()))
        assertFalse(service.deleteProject(deletedProjectId))
    }
}
