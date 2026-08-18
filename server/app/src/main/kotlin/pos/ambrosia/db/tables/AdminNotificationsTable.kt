package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object AdminNotificationsTable : SQLiteUUIDTable("admin_notifications") {
    val category = varchar("category", 50)
    val type = varchar("type", 100)
    val title = varchar("title", 255)
    val body = text("body")
    val actorUserId = optReference("actor_user_id", UsersTable)
    val actorUserName = varchar("actor_user_name", 255).nullable()
    val actorRole = varchar("actor_role", 255).nullable()
    val status = varchar("status", 50).nullable()
    val occurredAt = varchar("occurred_at", 50)
    val createdAt = varchar("created_at", 50)
    val dedupeKey = varchar("dedupe_key", 255).nullable().uniqueIndex()
    val metadataJson = text("metadata_json").nullable()
}

class AdminNotificationEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<AdminNotificationEntity>(AdminNotificationsTable)

    var category by AdminNotificationsTable.category
    var type by AdminNotificationsTable.type
    var title by AdminNotificationsTable.title
    var body by AdminNotificationsTable.body
    var actorUserId by AdminNotificationsTable.actorUserId
    var actorUserName by AdminNotificationsTable.actorUserName
    var actorRole by AdminNotificationsTable.actorRole
    var status by AdminNotificationsTable.status
    var occurredAt by AdminNotificationsTable.occurredAt
    var createdAt by AdminNotificationsTable.createdAt
    var dedupeKey by AdminNotificationsTable.dedupeKey
    var metadataJson by AdminNotificationsTable.metadataJson
}

object AdminNotificationReceiptsTable : Table("admin_notification_receipts") {
    val notificationId = reference("notification_id", AdminNotificationsTable)
    val adminUserId = reference("admin_user_id", UsersTable)
    val readAt = varchar("read_at", 50).nullable()
    val deletedAt = varchar("deleted_at", 50).nullable()
    val createdAt = varchar("created_at", 50)
    override val primaryKey = PrimaryKey(notificationId, adminUserId)
}

object AdminNotificationPreferencesTable : Table("admin_notification_preferences") {
    val adminUserId = reference("admin_user_id", UsersTable)
    val category = varchar("category", 50)
    val inAppEnabled = bool("in_app_enabled").default(true)
    val pushEnabled = bool("push_enabled").default(true)
    val createdAt = varchar("created_at", 50)
    val updatedAt = varchar("updated_at", 50)
    override val primaryKey = PrimaryKey(adminUserId, category)
}

object PushSubscriptionsTable : SQLiteUUIDTable("push_subscriptions") {
    val adminUserId = reference("admin_user_id", UsersTable)
    val endpoint = text("endpoint").uniqueIndex()
    val p256dh = text("p256dh")
    val auth = text("auth")
    val userAgent = text("user_agent").nullable()
    val createdAt = varchar("created_at", 50)
    val updatedAt = varchar("updated_at", 50)
    val revokedAt = varchar("revoked_at", 50).nullable()
}

class PushSubscriptionEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PushSubscriptionEntity>(PushSubscriptionsTable)

    var adminUserId by PushSubscriptionsTable.adminUserId
    var endpoint by PushSubscriptionsTable.endpoint
    var p256dh by PushSubscriptionsTable.p256dh
    var auth by PushSubscriptionsTable.auth
    var userAgent by PushSubscriptionsTable.userAgent
    var createdAt by PushSubscriptionsTable.createdAt
    var updatedAt by PushSubscriptionsTable.updatedAt
    var revokedAt by PushSubscriptionsTable.revokedAt
}
