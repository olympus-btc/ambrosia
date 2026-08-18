package pos.ambrosia.utest

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.AdminNotificationPreferencesTable
import pos.ambrosia.db.tables.AdminNotificationReceiptsTable
import pos.ambrosia.db.tables.AdminNotificationsTable
import pos.ambrosia.db.tables.PushSubscriptionsTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.models.AdminNotification
import pos.ambrosia.models.AdminNotificationEvent
import pos.ambrosia.models.AdminNotificationPreferences
import pos.ambrosia.models.WebPushKeys
import pos.ambrosia.models.WebPushSubscriptionRequest
import pos.ambrosia.services.AdminNotificationLivePublisher
import pos.ambrosia.services.AdminNotificationService
import pos.ambrosia.services.WebPushDispatchClient
import pos.ambrosia.services.WebPushDispatchPayload
import pos.ambrosia.services.WebPushDispatchResult
import pos.ambrosia.services.WebPushDispatchSubscription
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AdminNotificationServiceTest {
    private lateinit var dbFile: File
    private val service = AdminNotificationService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `createNotification creates receipts for active admin users only`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val cashierRoleId = ExposedTestDb.seedRole("cashier", isAdmin = false)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val cashierUserId = ExposedTestDb.seedUser("Beto", roleId = cashierRoleId)

        val result = service.createNotification(walletEvent())

        assertTrue(result.created)
        assertEquals(1, result.recipientCount)
        transaction {
            assertEquals(
                1,
                AdminNotificationReceiptsTable
                    .selectAll()
                    .where {
                        AdminNotificationReceiptsTable.adminUserId eq
                            EntityID(UUID.fromString(adminUserId), UsersTable)
                    }.count(),
            )
            assertEquals(
                0,
                AdminNotificationReceiptsTable
                    .selectAll()
                    .where {
                        AdminNotificationReceiptsTable.adminUserId eq
                            EntityID(UUID.fromString(cashierUserId), UsersTable)
                    }.count(),
            )
        }
    }

    @Test
    fun `createNotification creates default preferences for event category`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)

        service.createNotification(walletEvent(category = "orders"))

        transaction {
            val preferences =
                AdminNotificationPreferencesTable
                    .selectAll()
                    .where {
                        AdminNotificationPreferencesTable.adminUserId eq
                            EntityID(UUID.fromString(adminUserId), UsersTable)
                    }.single()

            assertEquals("orders", preferences[AdminNotificationPreferencesTable.category])
            assertTrue(preferences[AdminNotificationPreferencesTable.inAppEnabled])
            assertTrue(preferences[AdminNotificationPreferencesTable.pushEnabled])
        }
    }

    @Test
    fun `createNotification creates receipt when category in-app preference is disabled`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val now = "2026-07-13T12:00:00Z"

        transaction {
            AdminNotificationPreferencesTable.insert {
                it[AdminNotificationPreferencesTable.adminUserId] =
                    EntityID(UUID.fromString(adminUserId), UsersTable)
                it[category] = "wallet"
                it[inAppEnabled] = false
                it[pushEnabled] = true
                it[createdAt] = now
                it[updatedAt] = now
            }
        }

        val result = service.createNotification(walletEvent())

        assertEquals(1, result.recipientCount)
        transaction {
            assertEquals(1, AdminNotificationReceiptsTable.selectAll().count())
            assertEquals(1, AdminNotificationsTable.selectAll().count())
        }
    }

    @Test
    fun `createNotification skips duplicate dedupe key`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val event = walletEvent(dedupeKey = "wallet.payment.sent:hash-1")

        val first = service.createNotification(event)
        val second = service.createNotification(event)

        assertTrue(first.created)
        assertFalse(second.created)
        assertEquals(first.notificationId, second.notificationId)
        transaction {
            assertEquals(1, AdminNotificationsTable.selectAll().count())
            assertEquals(1, AdminNotificationReceiptsTable.selectAll().count())
        }
    }

    @Test
    fun `createNotification publishes live notification when category in-app preference is disabled`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        service.updatePreference(
            secondAdminId,
            AdminNotificationPreferences(category = "wallet", inAppEnabled = false, pushEnabled = true),
        )
        val livePublisher = RecordingAdminNotificationLivePublisher()
        val serviceWithLivePublisher = AdminNotificationService(livePublisher = livePublisher)

        val result = serviceWithLivePublisher.createNotification(walletEvent(dedupeKey = "wallet:live"))

        assertTrue(result.created)
        assertEquals(listOf(firstAdminId, secondAdminId), livePublisher.publishedAdminUserIds)
        assertEquals(
            listOf(result.notificationId, result.notificationId),
            livePublisher.publishedNotifications.map { it.id },
        )
        assertEquals(listOf("wallet", "wallet"), livePublisher.publishedNotifications.map { it.category })
    }

    @Test
    fun `createNotification does not publish live notification for duplicate dedupe key`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val livePublisher = RecordingAdminNotificationLivePublisher()
        val serviceWithLivePublisher = AdminNotificationService(livePublisher = livePublisher)
        val event = walletEvent(dedupeKey = "wallet:live-duplicate")

        serviceWithLivePublisher.createNotification(event)
        serviceWithLivePublisher.createNotification(event)

        assertEquals(1, livePublisher.publishedNotifications.size)
    }

    @Test
    fun `getNotifications returns admin feed and supports unread and category filters`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val walletNotification = service.createNotification(walletEvent(dedupeKey = "wallet:1"))
        service.createNotification(walletEvent(category = "orders", dedupeKey = "orders:1"))

        service.markRead(adminUserId, walletNotification.notificationId)

        val all = service.getNotifications(adminUserId)
        val unread = service.getNotifications(adminUserId, unreadOnly = true)
        val wallet = service.getNotifications(adminUserId, category = "wallet")

        assertEquals(2, all.size)
        assertEquals(1, unread.size)
        assertEquals("orders", unread.single().category)
        assertEquals(1, wallet.size)
        assertEquals("wallet", wallet.single().category)
        assertEquals(walletNotification.notificationId, wallet.single().id)
    }

    @Test
    fun `markAllRead marks only matching admin and category receipts`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        service.createNotification(walletEvent(dedupeKey = "wallet:1"))
        service.createNotification(walletEvent(category = "orders", dedupeKey = "orders:1"))

        val updated = service.markAllRead(firstAdminId, category = "wallet")

        assertEquals(1, updated)
        assertEquals(1, service.getNotifications(firstAdminId, unreadOnly = true).size)
        assertEquals(2, service.getNotifications(secondAdminId, unreadOnly = true).size)
    }

    @Test
    fun `deleteNotification hides notification only for matching admin receipt`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        val notification = service.createNotification(walletEvent(dedupeKey = "wallet:delete-one"))

        val deleted = service.deleteNotification(firstAdminId, notification.notificationId)

        assertTrue(deleted)
        assertEquals(0, service.getNotifications(firstAdminId).size)
        assertEquals(1, service.getNotifications(secondAdminId).size)
        assertFalse(service.markRead(firstAdminId, notification.notificationId))
        transaction {
            assertEquals(1, AdminNotificationsTable.selectAll().count())
            assertEquals(2, AdminNotificationReceiptsTable.selectAll().count())
        }
    }

    @Test
    fun `deleteAllNotifications hides only matching admin and category receipts`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        service.createNotification(walletEvent(dedupeKey = "wallet:delete-all"))
        service.createNotification(walletEvent(category = "orders", dedupeKey = "orders:delete-all"))

        val deleted = service.deleteAllNotifications(firstAdminId, category = "wallet")

        assertEquals(1, deleted)
        assertEquals(listOf("orders"), service.getNotifications(firstAdminId).map { it.category })
        assertEquals(2, service.getNotifications(secondAdminId).size)
    }

    @Test
    fun `getPreferences creates wallet default and updatePreference upserts category settings`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)

        val defaults = service.getPreferences(adminUserId)
        val updated =
            service.updatePreference(
                adminUserId,
                AdminNotificationPreferences(
                    category = "orders",
                    inAppEnabled = false,
                    pushEnabled = true,
                ),
            )
        val preferences = service.getPreferences(adminUserId)

        assertEquals("wallet", defaults.single().category)
        assertEquals("orders", updated.category)
        assertFalse(updated.inAppEnabled)
        assertTrue(updated.pushEnabled)
        assertEquals(setOf("wallet", "orders"), preferences.map { it.category }.toSet())
    }

    @Test
    fun `registerPushSubscription upserts active admin subscription and revokePushSubscription revokes only owner endpoint`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        val request = pushSubscriptionRequest(endpoint = "https://push.example/subscription")

        val saved = service.registerPushSubscription(firstAdminId, request)
        val updated =
            service.registerPushSubscription(
                firstAdminId,
                request.copy(userAgent = "updated-agent"),
            )
        val secondAdminRevoked = service.revokePushSubscription(secondAdminId, request.endpoint)
        val firstAdminRevoked = service.revokePushSubscription(firstAdminId, request.endpoint)

        assertEquals(saved.id, updated.id)
        assertEquals("updated-agent", updated.userAgent)
        assertFalse(secondAdminRevoked)
        assertTrue(firstAdminRevoked)
        transaction {
            val subscription = PushSubscriptionsTable.selectAll().single()
            assertEquals(firstAdminId, subscription[PushSubscriptionsTable.adminUserId].value.toString())
            assertEquals("updated-agent", subscription[PushSubscriptionsTable.userAgent])
            assertTrue(subscription[PushSubscriptionsTable.revokedAt] != null)
        }
    }

    @Test
    fun `createNotification dispatches Web Push only to admins with push enabled active subscriptions`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val firstAdminId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val secondAdminId = ExposedTestDb.seedUser("Grace", roleId = adminRoleId)
        service.registerPushSubscription(firstAdminId, pushSubscriptionRequest(endpoint = "https://push.example/ada"))
        service.registerPushSubscription(secondAdminId, pushSubscriptionRequest(endpoint = "https://push.example/grace"))
        service.updatePreference(
            secondAdminId,
            AdminNotificationPreferences(category = "wallet", inAppEnabled = true, pushEnabled = false),
        )
        val dispatchClient = RecordingWebPushDispatchClient()
        val serviceWithPush = AdminNotificationService(dispatchClient)

        serviceWithPush.createNotification(walletEvent(dedupeKey = "wallet:push"))

        assertEquals(listOf("https://push.example/ada"), dispatchClient.sentEndpoints)
        assertEquals(
            listOf(WebPushDispatchPayload(title = "Ambrosia", body = "Ada sent 1200 sats")),
            dispatchClient.sentPayloads,
        )
    }

    @Test
    fun `createNotification sends safe Web Push copy for technical wallet actors`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        service.registerPushSubscription(adminUserId, pushSubscriptionRequest(endpoint = "https://push.example/ada"))
        val dispatchClient = RecordingWebPushDispatchClient()
        val serviceWithPush = AdminNotificationService(dispatchClient)

        serviceWithPush.createNotification(
            walletEvent(
                dedupeKey = "wallet:incoming-push",
                title = "Wallet payment received",
                body = "Wallet received 90 sats",
                actorUserName = "Phoenix webhook",
                actorRole = "system",
            ),
        )

        assertEquals(
            listOf(WebPushDispatchPayload(title = "Ambrosia", body = "Wallet received 90 sats")),
            dispatchClient.sentPayloads,
        )
    }

    @Test
    fun `createNotification revokes push subscription when dispatcher returns gone`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        service.registerPushSubscription(adminUserId, pushSubscriptionRequest(endpoint = "https://push.example/expired"))
        val serviceWithExpiredPush =
            AdminNotificationService(
                RecordingWebPushDispatchClient(
                    result = WebPushDispatchResult(statusCode = 410, shouldRevokeSubscription = true),
                ),
            )

        serviceWithExpiredPush.createNotification(walletEvent(dedupeKey = "wallet:expired"))

        transaction {
            val subscription = PushSubscriptionsTable.selectAll().single()
            assertTrue(subscription[PushSubscriptionsTable.revokedAt] != null)
        }
    }

    private fun walletEvent(
        category: String = "wallet",
        dedupeKey: String = "wallet.payment.sent:hash",
        title: String = "Wallet payment sent",
        body: String = "Ada sent 1200 sats",
        actorUserName: String = "Ada",
        actorRole: String = "admin",
    ): AdminNotificationEvent =
        AdminNotificationEvent(
            category = category,
            type = "wallet.payment.sent",
            title = title,
            body = body,
            actorUserName = actorUserName,
            actorRole = actorRole,
            status = "success",
            occurredAt = "2026-07-13T12:00:00Z",
            dedupeKey = dedupeKey,
            metadataJson = """{"amountSats":1200,"currency":"BTC","paymentHash":"hash"}""",
        )

    private fun pushSubscriptionRequest(endpoint: String): WebPushSubscriptionRequest =
        WebPushSubscriptionRequest(
            endpoint = endpoint,
            keys = WebPushKeys(p256dh = "p256dh", auth = "auth"),
            userAgent = "test-agent",
        )

    private class RecordingWebPushDispatchClient(
        private val result: WebPushDispatchResult = WebPushDispatchResult(statusCode = 201),
    ) : WebPushDispatchClient {
        val sentEndpoints = mutableListOf<String>()
        val sentPayloads = mutableListOf<WebPushDispatchPayload>()

        override fun send(
            subscription: WebPushDispatchSubscription,
            payload: WebPushDispatchPayload,
        ): WebPushDispatchResult {
            sentEndpoints += subscription.endpoint
            sentPayloads += payload
            return result
        }
    }

    private class RecordingAdminNotificationLivePublisher : AdminNotificationLivePublisher {
        val publishedAdminUserIds = mutableListOf<String>()
        val publishedNotifications = mutableListOf<AdminNotification>()

        override fun publish(
            adminUserId: String,
            notification: AdminNotification,
        ) {
            publishedAdminUserIds += adminUserId
            publishedNotifications += notification
        }
    }
}
