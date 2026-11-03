package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.ContentConvertException
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.ContentTransformationException
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.CreateTimeEntryRequest
import pos.ambrosia.models.UpdateTimeEntryRequest
import pos.ambrosia.services.TimeEntryService
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.UnauthorizedApiException
import pos.ambrosia.utils.authorizePermission
import pos.ambrosia.utils.getCurrentUser
import pos.ambrosia.utils.hasPermission

fun Application.configureTimeEntries() {
    val timeEntryService = TimeEntryService()
    routing { route("/freelance/time-entries") { timeEntries(timeEntryService) } }
}

fun Route.timeEntries(timeEntryService: TimeEntryService) {
    authorizePermission("time_entries_read") {
        get("") {
            val from =
                call.request.queryParameters["from"]
                    ?: throw InvalidTimeEntryException("Both from and to dates are required")
            val to =
                call.request.queryParameters["to"]
                    ?: throw InvalidTimeEntryException("Both from and to dates are required")
            call.respond(
                HttpStatusCode.OK,
                timeEntryService.getTimeEntries(
                    startDate = from,
                    endDate = to,
                    selectedProjectId = call.request.queryParameters["project_id"],
                    selectedTaskId = call.request.queryParameters["task_id"],
                    selectedClientId = call.request.queryParameters["client_id"],
                ),
            )
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: throw InvalidTimeEntryException("Missing time entry ID")
            val entry =
                timeEntryService.getTimeEntryById(id)
                    ?: throw ResourceNotFoundException("Time entry not found")
            call.respond(HttpStatusCode.OK, entry)
        }
    }

    authorizePermission("time_entries_create") {
        post("") {
            val createTimeEntryRequest = call.receiveCreateRequest()
            val hasTasksCreatePermission = call.hasPermission("tasks_create")
            call.respond(HttpStatusCode.Created, timeEntryService.createTimeEntry(createTimeEntryRequest, hasTasksCreatePermission))
        }
    }

    authorizePermission("time_entries_update") {
        put("/{id}") {
            val id = call.parameters["id"] ?: throw InvalidTimeEntryException("Missing time entry ID")
            val updateTimeEntryRequest = call.receiveUpdateRequest()
            val hasTasksCreatePermission = call.hasPermission("tasks_create")
            call.respond(HttpStatusCode.OK, timeEntryService.updateTimeEntry(id, updateTimeEntryRequest, hasTasksCreatePermission))
        }
    }

    authorizePermission("time_entries_delete") {
        delete("/{id}") {
            val id = call.parameters["id"] ?: throw InvalidTimeEntryException("Missing time entry ID")
            timeEntryService.deleteTimeEntry(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private suspend fun ApplicationCall.receiveCreateRequest(): CreateTimeEntryRequest = receiveTimeEntryRequest()

private suspend fun ApplicationCall.receiveUpdateRequest(): UpdateTimeEntryRequest = receiveTimeEntryRequest()

private suspend inline fun <reified T : Any> ApplicationCall.receiveTimeEntryRequest(): T =
    try {
        receive<T>()
    } catch (_: BadRequestException) {
        throw InvalidTimeEntryException("Invalid time entry request body")
    } catch (_: ContentTransformationException) {
        throw InvalidTimeEntryException("Invalid time entry request body")
    } catch (_: ContentConvertException) {
        throw InvalidTimeEntryException("Invalid time entry request body")
    }
