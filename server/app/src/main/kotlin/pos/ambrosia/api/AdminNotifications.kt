package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationEnvironment
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.AdminNotificationCountResponse
import pos.ambrosia.models.AdminNotificationMutationResponse
import pos.ambrosia.models.AdminNotificationPreferenceUpdateRequest
import pos.ambrosia.models.AdminNotificationPreferences
import pos.ambrosia.models.VapidPublicKeyResponse
import pos.ambrosia.models.WebPushSubscriptionRequest
import pos.ambrosia.models.WebPushUnsubscribeRequest
import pos.ambrosia.services.AdminNotificationService
import pos.ambrosia.services.VapidKeyService
import pos.ambrosia.services.WebPushDispatchClients
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.getCurrentUser

fun createConfiguredAdminNotificationService(environment: ApplicationEnvironment): AdminNotificationService =
    AdminNotificationService(
        webPushDispatchClient = WebPushDispatchClients.fromEnvironment(environment),
        livePublisher = AdminNotificationsLiveNotifier,
    )

fun Application.configureAdminNotifications() {
    val adminNotificationService = createConfiguredAdminNotificationService(environment)
    val vapidKeyService = VapidKeyService(environment)
    routing { route("/admin") { adminNotifications(adminNotificationService, vapidKeyService) } }
}

private fun AdminNotificationPreferenceUpdateRequest.toPreferences(): AdminNotificationPreferences =
    AdminNotificationPreferences(
        category = category,
        inAppEnabled = inAppEnabled,
        pushEnabled = pushEnabled,
    )

fun Route.adminNotifications(
    adminNotificationService: AdminNotificationService,
    vapidKeyService: VapidKeyService,
) {
    authenticateAdmin {
        route("/notifications") {
            get("") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@get call.respond(HttpStatusCode.Unauthorized)
                val requestedLimit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 50
                val requestedOffset = call.request.queryParameters["offset"]?.toLongOrNull() ?: 0L
                val shouldShowUnreadOnly =
                    call.request.queryParameters["unreadOnly"]?.toBooleanStrictOrNull() ?: false
                val requestedCategory = call.request.queryParameters["category"]

                call.respond(
                    HttpStatusCode.OK,
                    adminNotificationService.getNotifications(
                        adminUserId = currentUser.userId,
                        limit = requestedLimit,
                        offset = requestedOffset,
                        unreadOnly = shouldShowUnreadOnly,
                        category = requestedCategory,
                    ),
                )
            }

            post("/read-all") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val requestedCategory = call.request.queryParameters["category"]
                val markedNotificationsCount = adminNotificationService.markAllRead(currentUser.userId, requestedCategory)
                call.respond(HttpStatusCode.OK, AdminNotificationCountResponse(updated = markedNotificationsCount))
            }

            delete("") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                val requestedCategory = call.request.queryParameters["category"]
                val deletedNotificationsCount =
                    adminNotificationService.deleteAllNotifications(currentUser.userId, requestedCategory)
                call.respond(HttpStatusCode.OK, AdminNotificationCountResponse(deleted = deletedNotificationsCount))
            }

            post("/{id}/read") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val notificationId =
                    call.parameters["id"]
                        ?: return@post call.respond(HttpStatusCode.BadRequest, "Missing notification ID")
                val wasNotificationMarkedRead =
                    try {
                        adminNotificationService.markRead(currentUser.userId, notificationId)
                    } catch (_: IllegalArgumentException) {
                        return@post call.respond(HttpStatusCode.BadRequest, "Malformed notification ID")
                    }

                if (!wasNotificationMarkedRead) {
                    call.respond(HttpStatusCode.NotFound, "Notification not found")
                    return@post
                }

                call.respond(HttpStatusCode.OK, AdminNotificationMutationResponse(id = notificationId, read = true))
            }

            delete("/{id}") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                val notificationId =
                    call.parameters["id"]
                        ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing notification ID")
                val wasNotificationDeleted =
                    try {
                        adminNotificationService.deleteNotification(currentUser.userId, notificationId)
                    } catch (_: IllegalArgumentException) {
                        return@delete call.respond(HttpStatusCode.BadRequest, "Malformed notification ID")
                    }

                if (!wasNotificationDeleted) {
                    call.respond(HttpStatusCode.NotFound, "Notification not found")
                    return@delete
                }

                call.respond(HttpStatusCode.OK, AdminNotificationMutationResponse(id = notificationId, deleted = true))
            }
        }

        route("/notification-preferences") {
            get("") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@get call.respond(HttpStatusCode.Unauthorized)
                call.respond(HttpStatusCode.OK, adminNotificationService.getPreferences(currentUser.userId))
            }

            put("") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@put call.respond(HttpStatusCode.Unauthorized)
                val preferenceUpdateRequest = call.receive<AdminNotificationPreferenceUpdateRequest>()
                if (preferenceUpdateRequest.category.isBlank()) {
                    call.respond(HttpStatusCode.BadRequest, "Category is required")
                    return@put
                }
                call.respond(
                    HttpStatusCode.OK,
                    adminNotificationService.updatePreference(
                        currentUser.userId,
                        preferenceUpdateRequest.toPreferences(),
                    ),
                )
            }
        }

        route("/push") {
            get("/vapid-public-key") {
                if (!vapidKeyService.isWebPushEnabled()) {
                    call.respond(HttpStatusCode.ServiceUnavailable, "Web Push is disabled")
                    return@get
                }
                val vapidKeys =
                    vapidKeyService.getConfiguredKeysOrNull()
                        ?: return@get call.respond(HttpStatusCode.ServiceUnavailable, "Web Push VAPID keys are not configured")
                call.respond(HttpStatusCode.OK, VapidPublicKeyResponse(vapidKeys.publicKey))
            }

            post("/subscriptions") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@post call.respond(HttpStatusCode.Unauthorized)
                val subscriptionRequest = call.receive<WebPushSubscriptionRequest>()
                if (subscriptionRequest.endpoint.isBlank()) {
                    call.respond(HttpStatusCode.BadRequest, "Endpoint is required")
                    return@post
                }
                call.respond(
                    HttpStatusCode.OK,
                    adminNotificationService.registerPushSubscription(currentUser.userId, subscriptionRequest),
                )
            }

            delete("/subscriptions") {
                val currentUser =
                    call.getCurrentUser()
                        ?: return@delete call.respond(HttpStatusCode.Unauthorized)
                val subscriptionEndpoint =
                    call.request.queryParameters["endpoint"]
                        ?: runCatching { call.receive<WebPushUnsubscribeRequest>() }.getOrNull()?.endpoint

                if (subscriptionEndpoint.isNullOrBlank()) {
                    call.respond(HttpStatusCode.BadRequest, "Endpoint is required")
                    return@delete
                }
                val wasRevoked =
                    adminNotificationService.revokePushSubscription(
                        adminUserId = currentUser.userId,
                        endpoint = subscriptionEndpoint,
                    )
                call.respond(HttpStatusCode.OK, mapOf("revoked" to wasRevoked))
            }
        }
    }
}
