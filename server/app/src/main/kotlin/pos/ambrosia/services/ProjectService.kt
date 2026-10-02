package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ClientsTable
import pos.ambrosia.db.tables.ProjectEntity
import pos.ambrosia.db.tables.ProjectsTable
import pos.ambrosia.logger
import pos.ambrosia.models.FreelanceProject
import pos.ambrosia.models.FreelanceProjectUpsert
import java.time.LocalDateTime
import java.util.UUID

class ProjectService {
    private val validStatuses = setOf("pending", "in_progress", "done", "paid", "cancelled")

    private fun parseUuid(value: String): UUID? =
        try {
            UUID.fromString(value)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun clientExists(clientId: String): Boolean {
        val clientUuid = parseUuid(clientId) ?: return false
        return !ClientsTable
            .selectAll()
            .where {
                (ClientsTable.id eq EntityID(clientUuid, ClientsTable)) and
                    (ClientsTable.isDeleted eq false)
            }.empty()
    }

    private fun isValidProjectRequest(projectRequest: FreelanceProjectUpsert): Boolean =
        projectRequest.name.isNotBlank() &&
            projectRequest.status in validStatuses &&
            projectRequest.hourlyRateCents?.let { hourlyRateCents -> hourlyRateCents >= 0 } != false

    private fun toProjectModel(projectEntity: ProjectEntity): FreelanceProject =
        FreelanceProject(
            id = projectEntity.id.value.toString(),
            clientId = projectEntity.clientId.value.toString(),
            name = projectEntity.name,
            status = projectEntity.status,
            hourlyRateCents = projectEntity.hourlyRateCents,
            isBillable = projectEntity.isBillable,
            isDeleted = projectEntity.isDeleted,
            createdAt = projectEntity.createdAt,
        )

    fun getProjects(): List<FreelanceProject> =
        transaction {
            ProjectEntity
                .find { ProjectsTable.isDeleted eq false }
                .filter { projectEntity -> clientExists(projectEntity.clientId.value.toString()) }
                .map { projectEntity -> toProjectModel(projectEntity) }
        }

    fun getProjectsByClientId(clientId: String): List<FreelanceProject>? =
        transaction {
            val clientUuid = parseUuid(clientId) ?: return@transaction null
            if (!clientExists(clientId)) return@transaction null

            ProjectEntity
                .find {
                    (ProjectsTable.clientId eq EntityID(clientUuid, ClientsTable)) and
                        (ProjectsTable.isDeleted eq false)
                }.map { projectEntity -> toProjectModel(projectEntity) }
        }

    fun getProjectById(projectId: String): FreelanceProject? =
        transaction {
            val projectUuid = parseUuid(projectId) ?: return@transaction null
            val projectEntity = ProjectEntity.findById(projectUuid) ?: return@transaction null
            if (projectEntity.isDeleted) return@transaction null
            if (!clientExists(projectEntity.clientId.value.toString())) return@transaction null
            toProjectModel(projectEntity)
        }

    fun addProject(
        clientId: String,
        projectRequest: FreelanceProjectUpsert,
    ): String? =
        transaction {
            val clientUuid = parseUuid(clientId) ?: return@transaction null
            if (!clientExists(clientId)) return@transaction null
            if (!isValidProjectRequest(projectRequest)) return@transaction null

            val projectId =
                ProjectEntity
                    .new(UUID.randomUUID()) {
                        this.clientId = EntityID(clientUuid, ClientsTable)
                        name = projectRequest.name
                        status = projectRequest.status
                        hourlyRateCents = projectRequest.hourlyRateCents
                        isBillable = projectRequest.isBillable
                        isDeleted = false
                        createdAt = LocalDateTime.now().toString()
                    }.id.value
                    .toString()
            logger.info("Freelance project created: $projectId for client $clientId")
            projectId
        }

    fun updateProject(
        projectId: String,
        projectRequest: FreelanceProjectUpsert,
    ): Boolean =
        transaction {
            val projectUuid = parseUuid(projectId) ?: return@transaction false
            if (!isValidProjectRequest(projectRequest)) return@transaction false

            val projectEntity = ProjectEntity.findById(projectUuid) ?: return@transaction false
            if (projectEntity.isDeleted) return@transaction false
            if (!clientExists(projectEntity.clientId.value.toString())) return@transaction false

            projectEntity.name = projectRequest.name
            projectEntity.status = projectRequest.status
            projectEntity.hourlyRateCents = projectRequest.hourlyRateCents
            projectEntity.isBillable = projectRequest.isBillable
            logger.info("Freelance project updated: $projectId")
            true
        }

    fun deleteProject(projectId: String): Boolean =
        transaction {
            val projectUuid = parseUuid(projectId) ?: return@transaction false
            val projectEntity = ProjectEntity.findById(projectUuid) ?: return@transaction false
            if (projectEntity.isDeleted) return@transaction false

            projectEntity.isDeleted = true
            logger.info("Freelance project soft deleted: $projectId")
            true
        }
}
