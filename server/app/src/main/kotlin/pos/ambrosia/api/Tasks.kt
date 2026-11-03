package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.FreelanceTaskUpsert
import pos.ambrosia.services.TaskService
import pos.ambrosia.utils.authorizePermission

fun Application.configureTasks() {
    val taskService = TaskService()
    routing { route("/freelance/tasks") { tasks(taskService) } }
}

fun Route.tasks(taskService: TaskService) {
    authorizePermission("tasks_read") {
        get("") {
            val tasks = taskService.getTasks()
            if (tasks.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No tasks found")
                return@get
            }
            call.respond(HttpStatusCode.OK, tasks)
        }

        get("/{id}") {
            val taskId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val task =
                taskService.getTaskById(taskId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Task not found")
            call.respond(HttpStatusCode.OK, task)
        }
    }

    authorizePermission("tasks_create") {
        post("") {
            val taskRequest = call.receive<FreelanceTaskUpsert>()
            val createdTaskId = taskService.addTask(taskRequest)
            if (createdTaskId == null) {
                call.respond(HttpStatusCode.BadRequest, "Invalid task data")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdTaskId, "message" to "Task added successfully"),
            )
        }
    }

    authorizePermission("tasks_update") {
        put("/{id}") {
            val taskId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val taskRequest = call.receive<FreelanceTaskUpsert>()
            val taskWasUpdated = taskService.updateTask(taskId, taskRequest)
            if (!taskWasUpdated) {
                call.respond(HttpStatusCode.NotFound, "Task with ID: $taskId not found or invalid")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("id" to taskId, "message" to "Task updated successfully"))
        }
    }

    authorizePermission("tasks_delete") {
        delete("/{id}") {
            val taskId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val taskWasDeleted = taskService.deleteTask(taskId)
            if (!taskWasDeleted) {
                call.respond(HttpStatusCode.NotFound, "Task not found")
                return@delete
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
