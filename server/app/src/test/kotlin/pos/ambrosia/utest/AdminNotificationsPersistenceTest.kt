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
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AdminNotificationsPersistenceTest {
    private lateinit var dbFile: File

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `admin notification tables store feed state preferences and push subscriptions`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val notificationId = UUID.randomUUID()
        val subscriptionId = UUID.randomUUID()
        val now = "2026-07-13T12:00:00Z"

        transaction {
            val adminEntityId = EntityID(UUID.fromString(adminUserId), UsersTable)

            AdminNotificationsTable.insert {
                it[id] = EntityID(notificationId, AdminNotificationsTable)
                it[category] = "wallet"
                it[type] = "wallet.payment.sent"
                it[title] = "Wallet payment sent"
                it[body] = "Ada sent 1200 sats"
                it[actorUserId] = adminEntityId
                it[actorUserName] = "Ada"
                it[actorRole] = "admin"
                it[status] = "success"
                it[occurredAt] = now
                it[createdAt] = now
                it[dedupeKey] = "wallet.payment.sent:test-hash"
                it[metadataJson] = """{"amountSats":1200,"currency":"BTC","paymentHash":"test-hash"}"""
            }

            AdminNotificationReceiptsTable.insert {
                it[AdminNotificationReceiptsTable.notificationId] =
                    EntityID(notificationId, AdminNotificationsTable)
                it[AdminNotificationReceiptsTable.adminUserId] = adminEntityId
                it[readAt] = null
                it[createdAt] = now
            }

            AdminNotificationPreferencesTable.insert {
                it[AdminNotificationPreferencesTable.adminUserId] = adminEntityId
                it[category] = "wallet"
                it[inAppEnabled] = true
                it[pushEnabled] = false
                it[createdAt] = now
                it[updatedAt] = now
            }

            PushSubscriptionsTable.insert {
                it[id] = EntityID(subscriptionId, PushSubscriptionsTable)
                it[PushSubscriptionsTable.adminUserId] = adminEntityId
                it[endpoint] = "https://push.example/subscription"
                it[p256dh] = "p256dh-key"
                it[auth] = "auth-secret"
                it[userAgent] = "Unit Test Browser"
                it[createdAt] = now
                it[updatedAt] = now
                it[revokedAt] = null
            }

            val notification =
                AdminNotificationsTable
                    .selectAll()
                    .where { AdminNotificationsTable.id eq EntityID(notificationId, AdminNotificationsTable) }
                    .single()
            assertEquals("wallet", notification[AdminNotificationsTable.category])
            assertEquals("wallet.payment.sent:test-hash", notification[AdminNotificationsTable.dedupeKey])
            assertEquals(
                """{"amountSats":1200,"currency":"BTC","paymentHash":"test-hash"}""",
                notification[AdminNotificationsTable.metadataJson],
            )

            val receipt =
                AdminNotificationReceiptsTable
                    .selectAll()
                    .where { AdminNotificationReceiptsTable.adminUserId eq adminEntityId }
                    .single()
            assertNull(receipt[AdminNotificationReceiptsTable.readAt])

            val preferences =
                AdminNotificationPreferencesTable
                    .selectAll()
                    .where { AdminNotificationPreferencesTable.adminUserId eq adminEntityId }
                    .single()
            assertEquals("wallet", preferences[AdminNotificationPreferencesTable.category])
            assertEquals(true, preferences[AdminNotificationPreferencesTable.inAppEnabled])
            assertEquals(false, preferences[AdminNotificationPreferencesTable.pushEnabled])

            val subscription =
                PushSubscriptionsTable
                    .selectAll()
                    .where { PushSubscriptionsTable.adminUserId eq adminEntityId }
                    .single()
            assertEquals("https://push.example/subscription", subscription[PushSubscriptionsTable.endpoint])
            assertNull(subscription[PushSubscriptionsTable.revokedAt])
        }
    }
}
