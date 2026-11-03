package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.Op
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.lessEq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ClientEntity
import pos.ambrosia.db.tables.ClientsTable
import pos.ambrosia.db.tables.CurrencyEntity
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.ProjectEntity
import pos.ambrosia.db.tables.ProjectsTable
import pos.ambrosia.db.tables.TaskEntity
import pos.ambrosia.db.tables.TasksTable
import pos.ambrosia.db.tables.TimeEntriesTable
import pos.ambrosia.db.tables.TimeEntryEntity
import pos.ambrosia.models.CreateTimeEntryRequest
import pos.ambrosia.models.TimeEntryResponse
import pos.ambrosia.models.UpdateTimeEntryRequest
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.PermissionDeniedException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.TimeEntryLockedException
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.UUID

class TimeEntryService {
    fun getTimeEntries(
        startDate: String,
        endDate: String,
        selectedProjectId: String? = null,
        selectedTaskId: String? = null,
        selectedClientId: String? = null,
    ): List<TimeEntryResponse> =
        transaction {
            val rangeStartDate = parseDate(startDate, "from")
            val rangeEndDate = parseDate(endDate, "to")
            if (rangeStartDate > rangeEndDate) throw InvalidTimeEntryException("from must be before or equal to to")

            var queryCondition: Op<Boolean> =
                (TimeEntriesTable.entryDate greaterEq rangeStartDate.toString()) and
                    (TimeEntriesTable.entryDate lessEq rangeEndDate.toString())
            selectedProjectId?.let { requestedProjectId ->
                queryCondition =
                    queryCondition and
                    (TimeEntriesTable.projectId eq EntityID(parseUuid(requestedProjectId, "project_id"), ProjectsTable))
            }
            selectedTaskId?.let { requestedTaskId ->
                queryCondition =
                    queryCondition and
                    (TimeEntriesTable.taskId eq EntityID(parseUuid(requestedTaskId, "task_id"), TasksTable))
            }
            selectedClientId?.let { requestedClientId ->
                val requestedClientEntityId = EntityID(parseUuid(requestedClientId, "client_id"), ClientsTable)
                val clientProjectIds =
                    ProjectEntity
                        .find { ProjectsTable.clientId eq requestedClientEntityId }
                        .map { clientProject -> clientProject.id }
                queryCondition = queryCondition and (TimeEntriesTable.projectId inList clientProjectIds)
            }

            val timeEntries =
                TimeEntryEntity
                    .find { queryCondition }
                    .orderBy(
                        TimeEntriesTable.entryDate to SortOrder.ASC,
                        TimeEntriesTable.startTime to SortOrder.ASC,
                        TimeEntriesTable.createdAt to SortOrder.ASC,
                    ).toList()
            val responseReferences = loadResponseReferences(timeEntries)
            timeEntries.map { timeEntry -> toResponse(timeEntry, responseReferences) }
        }

    fun getTimeEntryById(id: String): TimeEntryResponse? =
        transaction {
            findEntry(id)?.let(::toResponse)
        }

    fun createTimeEntry(
        request: CreateTimeEntryRequest,
        hasTasksCreatePermission: Boolean = false,
    ): TimeEntryResponse =
        transaction {
            val validatedTimeEntryInput =
                validateInput(
                    projectId = request.projectId,
                    taskId = request.taskId,
                    taskName = request.taskName,
                    hasTasksCreatePermission = hasTasksCreatePermission,
                    entryDate = request.entryDate,
                    startTime = request.startTime,
                    endTime = request.endTime,
                    description = request.description,
                    durationMinutes = request.durationMinutes,
                )
            val timeEntry =
                TimeEntryEntity.new(UUID.randomUUID()) {
                    projectId = validatedTimeEntryInput.project.id
                    taskId = validatedTimeEntryInput.task.id
                    entryDate = validatedTimeEntryInput.entryDate
                    startTime = validatedTimeEntryInput.startTime
                    endTime = validatedTimeEntryInput.endTime
                    description = validatedTimeEntryInput.description
                    durationMinutes = validatedTimeEntryInput.durationMinutes
                    isBillable = validatedTimeEntryInput.isBillable
                    invoiceId = null
                    isLocked = false
                    createdAt = currentTimestamp()
                }
            toResponse(timeEntry)
        }

    fun updateTimeEntry(
        id: String,
        request: UpdateTimeEntryRequest,
        hasTasksCreatePermission: Boolean = false,
    ): TimeEntryResponse =
        transaction {
            val timeEntry = findEntry(id) ?: throw ResourceNotFoundException("Time entry not found")
            ensureUnlocked(timeEntry)
            val validatedTimeEntryInput =
                validateInput(
                    projectId = request.projectId,
                    taskId = request.taskId,
                    taskName = request.taskName,
                    hasTasksCreatePermission = hasTasksCreatePermission,
                    entryDate = request.entryDate,
                    startTime = request.startTime,
                    endTime = request.endTime,
                    description = request.description,
                    durationMinutes = request.durationMinutes,
                )

            timeEntry.projectId = validatedTimeEntryInput.project.id
            timeEntry.taskId = validatedTimeEntryInput.task.id
            timeEntry.entryDate = validatedTimeEntryInput.entryDate
            timeEntry.startTime = validatedTimeEntryInput.startTime
            timeEntry.endTime = validatedTimeEntryInput.endTime
            timeEntry.description = validatedTimeEntryInput.description
            timeEntry.durationMinutes = validatedTimeEntryInput.durationMinutes
            timeEntry.isBillable = validatedTimeEntryInput.isBillable
            toResponse(timeEntry)
        }

    fun deleteTimeEntry(id: String) {
        transaction {
            val timeEntry = findEntry(id) ?: throw ResourceNotFoundException("Time entry not found")
            ensureUnlocked(timeEntry)
            timeEntry.delete()
        }
    }

    private fun findEntry(id: String): TimeEntryEntity? {
        val entryUuid = parseUuid(id, "id")
        return TimeEntryEntity
            .find { TimeEntriesTable.id eq EntityID(entryUuid, TimeEntriesTable) }
            .firstOrNull()
    }

    private fun validateInput(
        projectId: String,
        taskId: String?,
        taskName: String?,
        hasTasksCreatePermission: Boolean,
        entryDate: String,
        startTime: String?,
        endTime: String?,
        description: String?,
        durationMinutes: Int,
    ): ValidatedTimeEntry {
        if (durationMinutes <= 0) throw InvalidTimeEntryException("durationMinutes must be greater than 0")
        if (durationMinutes % DURATION_INCREMENT_MINUTES != 0) {
            throw InvalidTimeEntryException("durationMinutes must be a multiple of $DURATION_INCREMENT_MINUTES")
        }
        val project =
            ProjectEntity.findById(parseUuid(projectId, "projectId"))?.takeIf { !it.isDeleted }
                ?: throw ResourceNotFoundException("Project not found")

        if (project.status != "in_progress") {
            throw InvalidTimeEntryException("Invalid project status. Time tracking is only allowed in the 'in_progress' state.")
        }

        val task = resolveTask(taskId, taskName, hasTasksCreatePermission)
        val isBillable = task.isBillable && project.isBillable

        return ValidatedTimeEntry(
            project = project,
            task = task,
            entryDate = parseDate(entryDate, "entryDate").toString(),
            startTime = parseTime(startTime, "startTime"),
            endTime = parseTime(endTime, "endTime"),
            description = description,
            durationMinutes = durationMinutes,
            isBillable = isBillable,
        )
    }

    private fun resolveTask(
        taskId: String?,
        taskName: String?,
        hasTasksCreatePermission: Boolean,
    ): TaskEntity {
        if (!taskId.isNullOrBlank()) {
            return TaskEntity.findById(parseUuid(taskId, "taskId"))?.takeIf { !it.isDeleted }
                ?: throw ResourceNotFoundException("Task not found")
        }
        val trimmedTaskName = taskName?.trim()
        if (trimmedTaskName.isNullOrEmpty()) throw InvalidTimeEntryException("taskId or taskName is required")
        if (trimmedTaskName.length > MAX_TASK_NAME_LENGTH) {
            throw InvalidTimeEntryException("taskName must be at most $MAX_TASK_NAME_LENGTH characters")
        }
        val normalizedTaskName = trimmedTaskName.lowercase()
        val existingTask =
            TaskEntity
                .find { TasksTable.isDeleted eq false }
                .firstOrNull { task -> task.name.trim().lowercase() == normalizedTaskName }
        if (existingTask != null) return existingTask
        if (!hasTasksCreatePermission) throw PermissionDeniedException()
        return TaskEntity.new(UUID.randomUUID()) {
            name = trimmedTaskName
            isBillable = true
            isDeleted = false
            createdAt = LocalDateTime.now().toString()
        }
    }

    private fun ensureUnlocked(timeEntry: TimeEntryEntity) {
        if (timeEntry.invoiceId != null || timeEntry.isLocked) throw TimeEntryLockedException()
    }

    private fun toResponse(
        timeEntry: TimeEntryEntity,
        responseReferences: ResponseReferences? = null,
    ): TimeEntryResponse {
        val project =
            responseReferences?.projectsById?.get(timeEntry.projectId)
                ?: ProjectEntity.findById(timeEntry.projectId)
                ?: throw ResourceNotFoundException("Project not found")
        val client =
            responseReferences?.clientsById?.get(project.clientId)
                ?: ClientEntity.findById(project.clientId)
                ?: throw ResourceNotFoundException("Client not found")
        val task =
            responseReferences?.tasksById?.get(timeEntry.taskId)
                ?: TaskEntity.findById(timeEntry.taskId)
                ?: throw ResourceNotFoundException("Task not found")
        val currency =
            responseReferences?.currenciesById?.get(client.currencyId)
                ?: CurrencyEntity.findById(client.currencyId)
                ?: throw ResourceNotFoundException("Currency not found")
        return TimeEntryResponse(
            id = timeEntry.id.value.toString(),
            projectId = project.id.value.toString(),
            projectName = project.name,
            taskId = task.id.value.toString(),
            taskName = task.name,
            isBillable = timeEntry.isBillable,
            clientId = client.id.value.toString(),
            clientName = client.name,
            currencyId = currency.id.value.toString(),
            currencyAcronym = currency.acronym,
            entryDate = timeEntry.entryDate,
            startTime = timeEntry.startTime,
            endTime = timeEntry.endTime,
            description = timeEntry.description,
            durationMinutes = timeEntry.durationMinutes,
            invoiceId = timeEntry.invoiceId?.value?.toString(),
            isLocked = timeEntry.isLocked || timeEntry.invoiceId != null,
            createdAt = timeEntry.createdAt,
        )
    }

    private fun loadResponseReferences(timeEntries: List<TimeEntryEntity>): ResponseReferences {
        if (timeEntries.isEmpty()) return ResponseReferences()

        val projects =
            ProjectEntity
                .find { ProjectsTable.id inList timeEntries.map { it.projectId }.distinct() }
                .associateBy { it.id }
        val clients =
            ClientEntity
                .find { ClientsTable.id inList projects.values.map { it.clientId }.distinct() }
                .associateBy { it.id }
        val tasks =
            TaskEntity
                .find { TasksTable.id inList timeEntries.map { it.taskId }.distinct() }
                .associateBy { it.id }
        val currencies =
            CurrencyEntity
                .find { CurrencyTable.id inList clients.values.map { it.currencyId }.distinct() }
                .associateBy { it.id }
        return ResponseReferences(projects, clients, tasks, currencies)
    }

    private data class ResponseReferences(
        val projectsById: Map<EntityID<UUID>, ProjectEntity> = emptyMap(),
        val clientsById: Map<EntityID<UUID>, ClientEntity> = emptyMap(),
        val tasksById: Map<EntityID<UUID>, TaskEntity> = emptyMap(),
        val currenciesById: Map<EntityID<UUID>, CurrencyEntity> = emptyMap(),
    )

    private data class ValidatedTimeEntry(
        val project: ProjectEntity,
        val task: TaskEntity,
        val entryDate: String,
        val startTime: String?,
        val endTime: String?,
        val description: String?,
        val durationMinutes: Int,
        val isBillable: Boolean,
    )

    companion object {
        private const val DURATION_INCREMENT_MINUTES = 15
        private const val MAX_TASK_NAME_LENGTH = 255
        private val isoDatePattern = Regex("\\d{4}-\\d{2}-\\d{2}")
        private val timestampFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

        private fun parseUuid(
            rawValue: String,
            fieldName: String,
        ): UUID =
            try {
                UUID.fromString(rawValue)
            } catch (_: IllegalArgumentException) {
                throw InvalidTimeEntryException("$fieldName must be a valid UUID")
            }

        private fun parseDate(
            rawValue: String,
            fieldName: String,
        ): LocalDate {
            if (!isoDatePattern.matches(rawValue)) {
                throw InvalidTimeEntryException("$fieldName must use YYYY-MM-DD format")
            }
            return try {
                LocalDate.parse(rawValue, DateTimeFormatter.ISO_LOCAL_DATE)
            } catch (_: DateTimeParseException) {
                throw InvalidTimeEntryException("$fieldName must use YYYY-MM-DD format")
            }
        }

        private fun parseTime(
            timeValue: String?,
            fieldName: String,
        ): String? =
            timeValue?.let {
                try {
                    LocalTime.parse(it, DateTimeFormatter.ISO_LOCAL_TIME).toString()
                } catch (_: DateTimeParseException) {
                    throw InvalidTimeEntryException("$fieldName must use ISO local time format")
                }
            }

        private fun currentTimestamp(): String = LocalDateTime.now(ZoneOffset.UTC).format(timestampFormatter)
    }
}
