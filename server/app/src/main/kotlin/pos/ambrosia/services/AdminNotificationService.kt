package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.jdbc.Query
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.AdminNotificationEntity
import pos.ambrosia.db.tables.AdminNotificationPreferencesTable
import pos.ambrosia.db.tables.AdminNotificationReceiptsTable
import pos.ambrosia.db.tables.AdminNotificationsTable
import pos.ambrosia.db.tables.PushSubscriptionEntity
import pos.ambrosia.db.tables.PushSubscriptionsTable
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.AdminNotification
import pos.ambrosia.models.AdminNotificationCategories
import pos.ambrosia.models.AdminNotificationEvent
import pos.ambrosia.models.AdminNotificationPreferences
import pos.ambrosia.models.AdminNotificationPreferencesResponse
import pos.ambrosia.models.WebPushSubscriptionRequest
import pos.ambrosia.models.WebPushSubscriptionResponse
import java.time.Instant
import java.util.UUID

data class AdminNotificationCreateResult(
    val notificationId: String,
    val recipientCount: Int,
    val created: Boolean,
)

interface AdminNotificationLivePublisher {
    fun publish(
        adminUserId: String,
        notification: AdminNotification,
    )
}

object NoopAdminNotificationLivePublisher : AdminNotificationLivePublisher {
    override fun publish(
        adminUserId: String,
        notification: AdminNotification,
    ) = Unit
}

class AdminNotificationService(
    private val webPushDispatchClient: WebPushDispatchClient = NoopWebPushDispatchClient,
    private val livePublisher: AdminNotificationLivePublisher = NoopAdminNotificationLivePublisher,
) {
    private val defaultNotificationCategories = listOf(AdminNotificationCategories.WALLET)

    fun createNotification(event: AdminNotificationEvent): AdminNotificationCreateResult {
        val notificationCreationContext =
            transaction {
                event.dedupeKey?.let { dedupeKey ->
                    val existingNotification =
                        AdminNotificationEntity
                            .find { AdminNotificationsTable.dedupeKey eq dedupeKey }
                            .firstOrNull()

                    if (existingNotification != null) {
                        logger.info("Skipping duplicate admin notification with dedupeKey=$dedupeKey")
                        return@transaction AdminNotificationCreation(
                            createResult =
                                AdminNotificationCreateResult(
                                    notificationId = existingNotification.id.value.toString(),
                                    recipientCount = 0,
                                    created = false,
                                ),
                            pushSubscriptions = emptyList(),
                            pushPayload = null,
                        )
                    }
                }

                val currentTimestamp = Instant.now().toString()
                val adminNotificationEntity =
                    AdminNotificationEntity.new(UUID.randomUUID()) {
                        category = event.category
                        type = event.type
                        title = event.title
                        body = event.body
                        actorUserId = event.actorUserId?.let { EntityID(UUID.fromString(it), UsersTable) }
                        actorUserName = event.actorUserName
                        actorRole = event.actorRole
                        status = event.status
                        occurredAt = event.occurredAt
                        createdAt = currentTimestamp
                        dedupeKey = event.dedupeKey
                        metadataJson = event.metadataJson
                    }

                val activeAdminUserIds =
                    activeAdminUserIds()
                        .onEach { adminUserId -> ensurePreference(adminUserId, event.category, currentTimestamp) }
                val liveNotificationDeliveries = mutableListOf<AdminNotificationLiveDelivery>()
                val recipientCount =
                    activeAdminUserIds
                        .onEach { adminUserId ->
                            AdminNotificationReceiptsTable.insert { receiptRow ->
                                receiptRow[notificationId] = adminNotificationEntity.id
                                receiptRow[AdminNotificationReceiptsTable.adminUserId] = adminUserId
                                receiptRow[readAt] = null
                                receiptRow[deletedAt] = null
                                receiptRow[createdAt] = currentTimestamp
                            }
                            liveNotificationDeliveries.add(
                                AdminNotificationLiveDelivery(
                                    adminUserId = adminUserId.value.toString(),
                                    notification =
                                        adminNotificationEntity.toNotification(
                                            readAt = null,
                                        ),
                                ),
                            )
                        }.size
                val enabledPushSubscriptions =
                    activeAdminUserIds
                        .filter { adminUserId -> isPushEnabled(adminUserId, event.category, currentTimestamp) }
                        .flatMap { adminUserId -> activePushSubscriptions(adminUserId) }

                logger.info(
                    "Created admin notification id=${adminNotificationEntity.id.value}, category=${event.category}, type=${event.type}, recipients=$recipientCount",
                )

                AdminNotificationCreation(
                    createResult =
                        AdminNotificationCreateResult(
                            notificationId = adminNotificationEntity.id.value.toString(),
                            recipientCount = recipientCount,
                            created = true,
                        ),
                    pushSubscriptions = enabledPushSubscriptions,
                    pushPayload = event.toWebPushPayload(),
                    liveDeliveries = liveNotificationDeliveries,
                )
            }

        dispatchPushNotifications(
            pushSubscriptions = notificationCreationContext.pushSubscriptions,
            pushPayload = notificationCreationContext.pushPayload,
        )
        publishLiveNotifications(notificationCreationContext.liveDeliveries)
        return notificationCreationContext.createResult
    }

    fun getNotifications(
        adminUserId: String,
        limit: Int = 50,
        offset: Long = 0L,
        unreadOnly: Boolean = false,
        category: String? = null,
    ): List<AdminNotification> =
        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val boundedLimit = limit.coerceIn(1, 100)
            val boundedOffset = offset.coerceIn(0, Int.MAX_VALUE.toLong()).toInt()
            val baseReceiptVisibilityCondition =
                if (unreadOnly) {
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        AdminNotificationReceiptsTable.deletedAt.isNull() and
                        AdminNotificationReceiptsTable.readAt.isNull()
                } else {
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        AdminNotificationReceiptsTable.deletedAt.isNull()
                }
            val notificationVisibilityCondition =
                category
                    ?.takeIf { it.isNotBlank() }
                    ?.let { requestedCategory ->
                        baseReceiptVisibilityCondition and
                            (AdminNotificationsTable.category eq requestedCategory)
                    }
                    ?: baseReceiptVisibilityCondition

            (AdminNotificationReceiptsTable innerJoin AdminNotificationsTable)
                .selectAll()
                .where { notificationVisibilityCondition }
                .orderBy(AdminNotificationsTable.createdAt, SortOrder.DESC)
                .map { row ->
                    AdminNotification(
                        id = row[AdminNotificationsTable.id].value.toString(),
                        category = row[AdminNotificationsTable.category],
                        type = row[AdminNotificationsTable.type],
                        title = row[AdminNotificationsTable.title],
                        body = row[AdminNotificationsTable.body],
                        actorUserId = row[AdminNotificationsTable.actorUserId]?.value?.toString(),
                        actorUserName = row[AdminNotificationsTable.actorUserName],
                        actorRole = row[AdminNotificationsTable.actorRole],
                        status = row[AdminNotificationsTable.status],
                        occurredAt = row[AdminNotificationsTable.occurredAt],
                        createdAt = row[AdminNotificationsTable.createdAt],
                        readAt = row[AdminNotificationReceiptsTable.readAt],
                        metadataJson = row[AdminNotificationsTable.metadataJson],
                    )
                }.drop(boundedOffset)
                .take(boundedLimit)
        }

    fun deleteNotification(
        adminUserId: String,
        notificationId: String,
    ): Boolean =
        transaction {
            val deletedTimestamp = Instant.now().toString()
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val notificationEntityId = EntityID(UUID.fromString(notificationId), AdminNotificationsTable)
            val deletedCount =
                AdminNotificationReceiptsTable.update({
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        (AdminNotificationReceiptsTable.notificationId eq notificationEntityId) and
                        AdminNotificationReceiptsTable.deletedAt.isNull()
                }) {
                    it[deletedAt] = deletedTimestamp
                }
            deletedCount > 0
        }

    fun deleteAllNotifications(
        adminUserId: String,
        category: String? = null,
    ): Int =
        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val visibleNotificationIds =
                visibleReceiptQuery(adminEntityId, category)
                    .map { it[AdminNotificationReceiptsTable.notificationId] }

            visibleNotificationIds.sumOf { notificationId ->
                AdminNotificationReceiptsTable.update({
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        (AdminNotificationReceiptsTable.notificationId eq notificationId) and
                        AdminNotificationReceiptsTable.deletedAt.isNull()
                }) {
                    it[deletedAt] = Instant.now().toString()
                }
            }
        }

    fun markRead(
        adminUserId: String,
        notificationId: String,
    ): Boolean =
        transaction {
            val readTimestamp = Instant.now().toString()
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val notificationEntityId = EntityID(UUID.fromString(notificationId), AdminNotificationsTable)
            val markedReadCount =
                AdminNotificationReceiptsTable.update({
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        (AdminNotificationReceiptsTable.notificationId eq notificationEntityId) and
                        AdminNotificationReceiptsTable.deletedAt.isNull() and
                        AdminNotificationReceiptsTable.readAt.isNull()
                }) {
                    it[readAt] = readTimestamp
                }
            markedReadCount > 0
        }

    fun markAllRead(
        adminUserId: String,
        category: String? = null,
    ): Int =
        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val readTimestamp = Instant.now().toString()
            val unreadNotificationIds =
                unreadReceiptQuery(adminEntityId, category)
                    .map { it[AdminNotificationReceiptsTable.notificationId] }

            unreadNotificationIds.sumOf { notificationId ->
                AdminNotificationReceiptsTable.update({
                    (AdminNotificationReceiptsTable.adminUserId eq adminEntityId) and
                        (AdminNotificationReceiptsTable.notificationId eq notificationId) and
                        AdminNotificationReceiptsTable.readAt.isNull()
                }) {
                    it[readAt] = readTimestamp
                }
            }
        }

    fun getPreferences(adminUserId: String): List<AdminNotificationPreferencesResponse> =
        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            defaultNotificationCategories.forEach { category ->
                ensurePreference(adminEntityId, category, Instant.now().toString())
            }

            AdminNotificationPreferencesTable
                .selectAll()
                .where { AdminNotificationPreferencesTable.adminUserId eq adminEntityId }
                .map {
                    AdminNotificationPreferencesResponse(
                        adminUserId = adminUserId,
                        category = it[AdminNotificationPreferencesTable.category],
                        inAppEnabled = it[AdminNotificationPreferencesTable.inAppEnabled],
                        pushEnabled = it[AdminNotificationPreferencesTable.pushEnabled],
                        createdAt = it[AdminNotificationPreferencesTable.createdAt],
                        updatedAt = it[AdminNotificationPreferencesTable.updatedAt],
                    )
                }
        }

    fun updatePreference(
        adminUserId: String,
        preference: AdminNotificationPreferences,
    ): AdminNotificationPreferencesResponse =
        transaction {
            val preferenceUpdatedTimestamp = Instant.now().toString()
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            ensurePreference(adminEntityId, preference.category, preferenceUpdatedTimestamp)

            AdminNotificationPreferencesTable.update({
                (AdminNotificationPreferencesTable.adminUserId eq adminEntityId) and
                    (AdminNotificationPreferencesTable.category eq preference.category)
            }) {
                it[inAppEnabled] = preference.inAppEnabled
                it[pushEnabled] = preference.pushEnabled
                it[updatedAt] = preferenceUpdatedTimestamp
            }

            AdminNotificationPreferencesTable
                .selectAll()
                .where {
                    (AdminNotificationPreferencesTable.adminUserId eq adminEntityId) and
                        (AdminNotificationPreferencesTable.category eq preference.category)
                }.map {
                    AdminNotificationPreferencesResponse(
                        adminUserId = adminUserId,
                        category = it[AdminNotificationPreferencesTable.category],
                        inAppEnabled = it[AdminNotificationPreferencesTable.inAppEnabled],
                        pushEnabled = it[AdminNotificationPreferencesTable.pushEnabled],
                        createdAt = it[AdminNotificationPreferencesTable.createdAt],
                        updatedAt = it[AdminNotificationPreferencesTable.updatedAt],
                    )
                }.single()
        }

    fun registerPushSubscription(
        adminUserId: String,
        request: WebPushSubscriptionRequest,
    ): WebPushSubscriptionResponse =
        transaction {
            val subscriptionUpdatedTimestamp = Instant.now().toString()
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            val existingSubscription =
                PushSubscriptionEntity
                    .find { PushSubscriptionsTable.endpoint eq request.endpoint }
                    .firstOrNull()

            val pushSubscriptionEntity =
                if (existingSubscription == null) {
                    PushSubscriptionEntity.new(UUID.randomUUID()) {
                        this.adminUserId = adminEntityId
                        endpoint = request.endpoint
                        p256dh = request.keys.p256dh
                        auth = request.keys.auth
                        userAgent = request.userAgent
                        createdAt = subscriptionUpdatedTimestamp
                        updatedAt = subscriptionUpdatedTimestamp
                        revokedAt = null
                    }
                } else {
                    existingSubscription.apply {
                        this.adminUserId = adminEntityId
                        endpoint = request.endpoint
                        p256dh = request.keys.p256dh
                        auth = request.keys.auth
                        userAgent = request.userAgent
                        updatedAt = subscriptionUpdatedTimestamp
                        revokedAt = null
                    }
                }

            pushSubscriptionEntity.toResponse()
        }

    fun revokePushSubscription(
        adminUserId: String,
        endpoint: String,
    ): Boolean =
        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)
            revokePushSubscriptionByEndpoint(endpoint, adminEntityId)
        }

    fun revokeAllPushSubscriptions() {
        transaction {
            val revokedTimestamp = Instant.now().toString()
            PushSubscriptionsTable.update {
                it[revokedAt] = revokedTimestamp
                it[updatedAt] = revokedTimestamp
            }
        }
    }

    private fun activeAdminUserIds(): List<EntityID<UUID>> =
        (UsersTable innerJoin RolesTable)
            .selectAll()
            .where {
                (UsersTable.isDeleted eq false) and
                    (RolesTable.isDeleted eq false) and
                    (RolesTable.isAdmin eq true)
            }.map { it[UsersTable.id] }

    private fun isPushEnabled(
        adminUserId: EntityID<UUID>,
        category: String,
        now: String,
    ): Boolean {
        val existingNotificationPreference = findPreference(adminUserId, category)

        if (existingNotificationPreference == null) {
            insertDefaultPreference(adminUserId, category, now)
            return true
        }

        return existingNotificationPreference[AdminNotificationPreferencesTable.pushEnabled]
    }

    private fun ensurePreference(
        adminUserId: EntityID<UUID>,
        category: String,
        now: String,
    ) {
        if (findPreference(adminUserId, category) == null) {
            insertDefaultPreference(adminUserId, category, now)
        }
    }

    private fun findPreference(
        adminUserId: EntityID<UUID>,
        category: String,
    ) = AdminNotificationPreferencesTable
        .selectAll()
        .where {
            (AdminNotificationPreferencesTable.adminUserId eq adminUserId) and
                (AdminNotificationPreferencesTable.category eq category)
        }.firstOrNull()

    private fun insertDefaultPreference(
        adminUserId: EntityID<UUID>,
        category: String,
        now: String,
    ) {
        AdminNotificationPreferencesTable.insert { preferenceRow ->
            preferenceRow[AdminNotificationPreferencesTable.adminUserId] = adminUserId
            preferenceRow[AdminNotificationPreferencesTable.category] = category
            preferenceRow[inAppEnabled] = true
            preferenceRow[pushEnabled] = true
            preferenceRow[createdAt] = now
            preferenceRow[updatedAt] = now
        }
    }

    private fun unreadReceiptQuery(
        adminUserId: EntityID<UUID>,
        category: String?,
    ): Query {
        val baseUnreadReceiptCondition =
            (AdminNotificationReceiptsTable.adminUserId eq adminUserId) and
                AdminNotificationReceiptsTable.deletedAt.isNull() and
                AdminNotificationReceiptsTable.readAt.isNull()
        val unreadReceiptCondition =
            category
                ?.takeIf { it.isNotBlank() }
                ?.let { requestedCategory ->
                    baseUnreadReceiptCondition and
                        (AdminNotificationsTable.category eq requestedCategory)
                }
                ?: baseUnreadReceiptCondition

        return (AdminNotificationReceiptsTable innerJoin AdminNotificationsTable)
            .selectAll()
            .where { unreadReceiptCondition }
    }

    private fun visibleReceiptQuery(
        adminUserId: EntityID<UUID>,
        category: String?,
    ): Query {
        val baseVisibleReceiptCondition =
            (AdminNotificationReceiptsTable.adminUserId eq adminUserId) and
                AdminNotificationReceiptsTable.deletedAt.isNull()
        val visibleReceiptCondition =
            category
                ?.takeIf { it.isNotBlank() }
                ?.let { requestedCategory ->
                    baseVisibleReceiptCondition and
                        (AdminNotificationsTable.category eq requestedCategory)
                }
                ?: baseVisibleReceiptCondition

        return (AdminNotificationReceiptsTable innerJoin AdminNotificationsTable)
            .selectAll()
            .where { visibleReceiptCondition }
    }

    private fun activePushSubscriptions(adminUserId: EntityID<UUID>): List<WebPushDispatchSubscription> =
        PushSubscriptionsTable
            .selectAll()
            .where {
                (PushSubscriptionsTable.adminUserId eq adminUserId) and
                    PushSubscriptionsTable.revokedAt.isNull()
            }.map { pushSubscriptionRow ->
                WebPushDispatchSubscription(
                    endpoint = pushSubscriptionRow[PushSubscriptionsTable.endpoint],
                    p256dh = pushSubscriptionRow[PushSubscriptionsTable.p256dh],
                    auth = pushSubscriptionRow[PushSubscriptionsTable.auth],
                )
            }

    private fun dispatchPushNotifications(
        pushSubscriptions: List<WebPushDispatchSubscription>,
        pushPayload: WebPushDispatchPayload?,
    ) {
        if (pushPayload == null) return

        pushSubscriptions.forEach { subscription ->
            val dispatchResult = webPushDispatchClient.send(subscription, pushPayload)
            if (dispatchResult.shouldRevokeSubscription) {
                transaction { revokePushSubscriptionByEndpoint(subscription.endpoint) }
            }
        }
    }

    private fun AdminNotificationEvent.toWebPushPayload(): WebPushDispatchPayload {
        val actorLabel = webPushActorLabel()
        return WebPushDispatchPayload(
            title = WEB_PUSH_NOTIFICATION_TITLE,
            body = webPushBody(actorLabel),
        )
    }

    private fun AdminNotificationEvent.webPushBody(actorLabel: String): String {
        val notificationBody = body.takeIf { it.isNotBlank() } ?: type
        return if (notificationBody.startsWith(actorLabel, ignoreCase = true)) {
            notificationBody
        } else {
            "$actorLabel: $notificationBody"
        }
    }

    private fun AdminNotificationEvent.webPushActorLabel(): String =
        when {
            actorUserName.isTechnicalActorName() -> "Wallet"
            !actorUserName.isNullOrBlank() -> actorUserName
            !actorRole.isNullOrBlank() -> actorRole
            !actorUserId.isNullOrBlank() -> actorUserId
            else -> "System"
        }

    private fun String?.isTechnicalActorName(): Boolean =
        this
            ?.trim()
            ?.lowercase() == PHOENIX_WEBHOOK_ACTOR_NAME

    private fun publishLiveNotifications(liveDeliveries: List<AdminNotificationLiveDelivery>) {
        liveDeliveries.forEach { delivery ->
            livePublisher.publish(
                adminUserId = delivery.adminUserId,
                notification = delivery.notification,
            )
        }
    }

    private fun revokePushSubscriptionByEndpoint(
        endpoint: String,
        adminUserId: EntityID<UUID>? = null,
    ): Boolean {
        val revokedTimestamp = Instant.now().toString()
        val baseRevocableSubscriptionCondition =
            (PushSubscriptionsTable.endpoint eq endpoint) and
                PushSubscriptionsTable.revokedAt.isNull()
        val revocableSubscriptionCondition =
            adminUserId?.let { adminEntityId ->
                baseRevocableSubscriptionCondition and (PushSubscriptionsTable.adminUserId eq adminEntityId)
            } ?: baseRevocableSubscriptionCondition

        return PushSubscriptionsTable.update({ revocableSubscriptionCondition }) {
            it[revokedAt] = revokedTimestamp
            it[updatedAt] = revokedTimestamp
        } > 0
    }

    private fun PushSubscriptionEntity.toResponse(): WebPushSubscriptionResponse =
        WebPushSubscriptionResponse(
            id = id.value.toString(),
            endpoint = endpoint,
            userAgent = userAgent,
            createdAt = createdAt,
            updatedAt = updatedAt,
            revokedAt = revokedAt,
        )

    private fun AdminNotificationEntity.toNotification(readAt: String?): AdminNotification =
        AdminNotification(
            id = id.value.toString(),
            category = category,
            type = type,
            title = title,
            body = body,
            actorUserId = actorUserId?.value?.toString(),
            actorUserName = actorUserName,
            actorRole = actorRole,
            status = status,
            occurredAt = occurredAt,
            createdAt = createdAt,
            readAt = readAt,
            metadataJson = metadataJson,
        )

    private data class AdminNotificationCreation(
        val createResult: AdminNotificationCreateResult,
        val pushSubscriptions: List<WebPushDispatchSubscription>,
        val pushPayload: WebPushDispatchPayload?,
        val liveDeliveries: List<AdminNotificationLiveDelivery> = emptyList(),
    )

    private data class AdminNotificationLiveDelivery(
        val adminUserId: String,
        val notification: AdminNotification,
    )

    private companion object {
        const val PHOENIX_WEBHOOK_ACTOR_NAME = "phoenix webhook"
        const val WEB_PUSH_NOTIFICATION_TITLE = "Ambrosia"
    }
}
