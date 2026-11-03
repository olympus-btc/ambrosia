package pos.ambrosia.services

import pos.ambrosia.models.FreelanceReportCurrencyGroup
import pos.ambrosia.models.FreelanceReportProjectGroup
import pos.ambrosia.models.FreelanceReportResponse
import pos.ambrosia.models.FreelanceReportTaskGroup

class FreelanceReportService(
    private val billableTimeAggregationService: BillableTimeAggregationService = BillableTimeAggregationService(),
) {
    fun getBillingReport(
        startDate: String,
        endDate: String,
        clientId: String? = null,
    ): FreelanceReportResponse {
        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines(startDate, endDate, clientId = clientId)

        val currencyGroups =
            billableTimeEntryLines
                .groupBy { billableTimeEntryLine -> billableTimeEntryLine.currencyId to billableTimeEntryLine.currencyAcronym }
                .map { (currencyIdAndAcronym, timeEntryLinesForCurrency) ->
                    val (currencyId, currencyAcronym) = currencyIdAndAcronym
                    FreelanceReportCurrencyGroup(
                        currencyId = currencyId,
                        currencyAcronym = currencyAcronym,
                        totalDurationMinutes = timeEntryLinesForCurrency.sumOf { it.durationMinutes },
                        totalAmountCents = timeEntryLinesForCurrency.sumOf { it.amountCents },
                        projects = groupByProject(timeEntryLinesForCurrency),
                    )
                }.sortedBy { currencyGroup -> currencyGroup.currencyAcronym }

        return FreelanceReportResponse(from = startDate, to = endDate, currencies = currencyGroups)
    }

    private fun groupByProject(timeEntryLines: List<BillableTimeEntryLine>): List<FreelanceReportProjectGroup> =
        timeEntryLines
            .groupBy { billableTimeEntryLine -> billableTimeEntryLine.projectId }
            .map { (_, timeEntryLinesForProject) ->
                val representativeLine = timeEntryLinesForProject.first()
                FreelanceReportProjectGroup(
                    projectId = representativeLine.projectId,
                    projectName = representativeLine.projectName,
                    clientId = representativeLine.clientId,
                    clientName = representativeLine.clientName,
                    durationMinutes = timeEntryLinesForProject.sumOf { it.durationMinutes },
                    amountCents = timeEntryLinesForProject.sumOf { it.amountCents },
                    tasks = groupByTask(timeEntryLinesForProject),
                )
            }.sortedBy { projectGroup -> projectGroup.projectName }

    private fun groupByTask(timeEntryLines: List<BillableTimeEntryLine>): List<FreelanceReportTaskGroup> =
        timeEntryLines
            .groupBy { billableTimeEntryLine -> billableTimeEntryLine.taskId }
            .map { (_, timeEntryLinesForTask) ->
                val representativeLine = timeEntryLinesForTask.first()
                FreelanceReportTaskGroup(
                    taskId = representativeLine.taskId,
                    taskName = representativeLine.taskName,
                    durationMinutes = timeEntryLinesForTask.sumOf { it.durationMinutes },
                    amountCents = timeEntryLinesForTask.sumOf { it.amountCents },
                )
            }.sortedBy { taskGroup -> taskGroup.taskName }
}
