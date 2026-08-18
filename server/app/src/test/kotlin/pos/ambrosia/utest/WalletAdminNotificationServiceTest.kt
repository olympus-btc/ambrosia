package pos.ambrosia.utest

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.PaymentNotification
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PaymentResponse
import pos.ambrosia.services.AdminNotificationService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class WalletAdminNotificationServiceTest {
    private lateinit var dbFile: File
    private lateinit var adminNotificationService: AdminNotificationService
    private lateinit var walletAdminNotificationService: WalletAdminNotificationService

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
        adminNotificationService = AdminNotificationService()
        walletAdminNotificationService = WalletAdminNotificationService(adminNotificationService)
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `notifyInvoicePaymentSent creates wallet notification with actor role and safe metadata`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val cashierRoleId = ExposedTestDb.seedRole("cashier", isAdmin = false)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val cashierUserId = ExposedTestDb.seedUser("Beto", roleId = cashierRoleId)

        walletAdminNotificationService.notifyInvoicePaymentSent(
            actorUserId = cashierUserId,
            invoicePaymentRequest =
                PayInvoiceRequest(
                    amountSat = 1200,
                    invoice = "lnbc-sensitive-invoice",
                    exchangeRate = 65000.0,
                    exchangeRateCurrency = "USD",
                ),
            invoicePaymentResponse =
                PaymentResponse(
                    recipientAmountSat = 1200,
                    routingFeeSat = 3,
                    paymentId = "payment-id-1",
                    paymentHash = "payment-hash-1",
                    paymentPreimage = "sensitive-preimage",
                ),
        )

        val notification = adminNotificationService.getNotifications(adminUserId).single()
        val metadata = Json.parseToJsonElement(notification.metadataJson.orEmpty()).jsonObject

        assertEquals("wallet", notification.category)
        assertEquals("wallet.payment.sent", notification.type)
        assertEquals("success", notification.status)
        assertEquals(cashierUserId, notification.actorUserId)
        assertEquals("Beto", notification.actorUserName)
        assertEquals("cashier", notification.actorRole)
        assertEquals("lightning_invoice", metadata["paymentKind"]?.jsonPrimitive?.content)
        assertEquals("1200", metadata["recipientAmountSats"]?.jsonPrimitive?.content)
        assertFalse(notification.metadataJson.orEmpty().contains("lnbc-sensitive-invoice"))
        assertFalse(notification.metadataJson.orEmpty().contains("sensitive-preimage"))
    }

    @Test
    fun `notifyIncomingPaymentReceived creates deduplicated Phoenix webhook notification`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)
        val payload =
            PaymentNotification(
                type = "payment_received",
                timestamp = 123456789,
                amountSat = 2500,
                paymentHash = "incoming-hash-1",
                externalId = "ticket-1",
            )

        walletAdminNotificationService.notifyIncomingPaymentReceived(payload)
        walletAdminNotificationService.notifyIncomingPaymentReceived(payload)

        val notification = adminNotificationService.getNotifications(adminUserId).single()
        val metadata = Json.parseToJsonElement(notification.metadataJson.orEmpty()).jsonObject

        assertEquals("wallet.payment.received", notification.type)
        assertEquals("Phoenix webhook", notification.actorUserName)
        assertEquals("system", notification.actorRole)
        assertEquals("2500", metadata["amountSats"]?.jsonPrimitive?.content)
        assertEquals("123456789", metadata["phoenixTimestamp"]?.jsonPrimitive?.content)
    }

    @Test
    fun `notifyIncomingPaymentReceived ignores non payment received webhook types`() {
        val adminRoleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val adminUserId = ExposedTestDb.seedUser("Ada", roleId = adminRoleId)

        walletAdminNotificationService.notifyIncomingPaymentReceived(
            PaymentNotification(type = "node_state_changed", amountSat = 2500, paymentHash = "ignored-hash"),
        )

        assertTrue(adminNotificationService.getNotifications(adminUserId).isEmpty())
    }
}
