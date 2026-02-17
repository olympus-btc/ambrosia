package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Dish
import pos.ambrosia.services.DishService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureDishes() {
    val connection: Connection = DatabaseConnection.getConnection()
    val dishService = DishService(connection)
    routing { route("/dishes") { dishes(dishService) } }
}

fun Route.dishes(dishService: DishService) {
    authorizePermission("dish_read") {
        get("") {
            val dishes = dishService.getDishes()
            if (dishes.isEmpty()) {
                call.respond(HttpStatusCode.NoContent, "No dishes found")
                return@get
            }
            call.respond(HttpStatusCode.OK, dishes)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val dish = dishService.getDishById(id)
            if (dish == null) {
                call.respond(HttpStatusCode.NotFound, "Dish not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, dish)
        }
    }
    authorizePermission("dish_create") {
        post("") {
            val dish = call.receive<Dish>()
            val id = dishService.addDish(dish)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to id, "message" to "Dish added successfully"),
            )
        }
    }
    authorizePermission("dish_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedDish = call.receive<Dish>()
            val isUpdated = dishService.updateDish(updatedDish.copy(id = id))
            logger.info(isUpdated.toString())

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Dish with ID: $id not found")
                return@put
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Dish updated successfully"))
        }
    }
    authorizePermission("dish_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            dishService.deleteDish(id)
            call.respond(
                HttpStatusCode.NoContent,
                mapOf("id" to id, "message" to "Dish deleted successfully"),
            )
        }
    }
}
