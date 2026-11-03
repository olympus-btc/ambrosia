package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.Op
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
import pos.ambrosia.utils.InvalidTimeEntryException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.UUID

data class BillableTimeEntryLine(
    val timeEntryId: String,
    val entryDate: String,
    val clientId: String,
    val clientName: String,
    val currencyId: String,
    val currencyAcronym: String,
    val projectId: String,
    val projectName: String,
    val taskId: String,
    val taskName: String,
    val durationMinutes: Int,
    val isBillable: Boolean,
    val rateCents: Int,
    val amountCents: Int,
)

class BillableTimeAggregationService {
    fun getBillableTimeEntryLines(
        startDate: String,
        endDate: String,
        clientId: String? = null,
        projectId: String? = null,
        taskId: String? = null,
    ): List<BillableTimeEntryLine> =
        transaction {
            val rangeStartDate = parseDate(startDate, "from")
            val rangeEndDate = parseDate(endDate, "to")
            if (rangeStartDate > rangeEndDate) throw InvalidTimeEntryException("from must be before or equal to to")

            var queryCondition: Op<Boolean> =
                (TimeEntriesTable.entryDate greaterEq rangeStartDate.toString()) and
                    (TimeEntriesTable.entryDate lessEq rangeEndDate.toString())

            clientId?.let { requestedClientId ->
                val clientProjectIds =
                    ProjectEntity
                        .find { ProjectsTable.clientId eq EntityID(parseUuid(requestedClientId, "client_id"), ClientsTable) }
                        .map { it.id }
                if (clientProjectIds.isEmpty()) return@transaction emptyList()
                queryCondition = queryCondition and (TimeEntriesTable.projectId inList clientProjectIds)
            }
            projectId?.let { requestedProjectId ->
                queryCondition =
                    queryCondition and
                    (TimeEntriesTable.projectId eq EntityID(parseUuid(requestedProjectId, "project_id"), ProjectsTable))
            }
            taskId?.let { requestedTaskId ->
                queryCondition =
                    queryCondition and
                    (TimeEntriesTable.taskId eq EntityID(parseUuid(requestedTaskId, "task_id"), TasksTable))
            }

            val timeEntries = TimeEntryEntity.find { queryCondition }.toList()
            if (timeEntries.isEmpty()) return@transaction emptyList()

            val projectsById =
                ProjectEntity
                    .find { ProjectsTable.id inList timeEntries.map { timeEntry -> timeEntry.projectId }.distinct() }
                    .associateBy { it.id }
            val clientsById =
                ClientEntity
                    .find { ClientsTable.id inList projectsById.values.map { project -> project.clientId }.distinct() }
                    .associateBy { it.id }
            val tasksById =
                TaskEntity
                    .find { TasksTable.id inList timeEntries.map { timeEntry -> timeEntry.taskId }.distinct() }
                    .associateBy { it.id }
            val currenciesById =
                CurrencyEntity
                    .find { CurrencyTable.id inList clientsById.values.map { client -> client.currencyId }.distinct() }
                    .associateBy { it.id }

            timeEntries.map { timeEntry ->
                val project = projectsById.getValue(timeEntry.projectId)
                val client = clientsById.getValue(project.clientId)
                val task = tasksById.getValue(timeEntry.taskId)
                val currency = currenciesById.getValue(client.currencyId)
                val isBillable = task.isBillable && project.isBillable
                val rateCents = if (isBillable) project.hourlyRateCents ?: client.hourlyRateCents else 0
                val amountCents = if (isBillable) calculateAmountCents(rateCents, timeEntry.durationMinutes) else 0

                BillableTimeEntryLine(
                    timeEntryId = timeEntry.id.value.toString(),
                    entryDate = timeEntry.entryDate,
                    clientId = client.id.value.toString(),
                    clientName = client.name,
                    currencyId = currency.id.value.toString(),
                    currencyAcronym = currency.acronym,
                    projectId = project.id.value.toString(),
                    projectName = project.name,
                    taskId = task.id.value.toString(),
                    taskName = task.name,
                    durationMinutes = timeEntry.durationMinutes,
                    isBillable = isBillable,
                    rateCents = rateCents,
                    amountCents = amountCents,
                )
            }
        }

    companion object {
        private val isoDatePattern = Regex("\\d{4}-\\d{2}-\\d{2}")

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

        private fun calculateAmountCents(
            rateCents: Int,
            durationMinutes: Int,
        ): Int =
            try {
                BigDecimal
                    .valueOf(rateCents.toLong())
                    .multiply(BigDecimal.valueOf(durationMinutes.toLong()))
                    .divide(BigDecimal.valueOf(60L), 0, RoundingMode.HALF_UP)
                    .intValueExact()
            } catch (_: ArithmeticException) {
                throw InvalidTimeEntryException("Calculated amount exceeds the supported range")
            }
    }
}
