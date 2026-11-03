package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.testing.testApplication
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.configureInvoicePayoutSnapshotEncryptionBackfill
import pos.ambrosia.db.tables.InvoiceEntity
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.SecretsCipher
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class InvoicePayoutSnapshotEncryptionBackfillTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `encrypts a plaintext legacy payout snapshot left over from before this feature`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId)
        val legacyPayoutSnapshot = """{"id":"legacy-account","type":"bank","accountHolder":"Jane Doe"}"""
        val invoiceId = ExposedTestDb.seedInvoice(clientId, currencyId, payoutSnapshot = legacyPayoutSnapshot)

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "invoice-snapshot-backfill-legacy-secret")
            }
            application {
                configureInvoicePayoutSnapshotEncryptionBackfill()
            }
        }

        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("invoice-snapshot-backfill-legacy-secret")
        val storedInvoice = transaction { InvoiceEntity.findById(UUID.fromString(invoiceId)) }
        assertNotEquals(legacyPayoutSnapshot, storedInvoice?.payoutSnapshot)
        assertEquals(legacyPayoutSnapshot, SecretsCipher.decryptOrNull(storedInvoice?.payoutSnapshot, fieldEncryptionKey))
    }

    @Test
    fun `does not re-encrypt a payout snapshot that is already encrypted`() {
        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("invoice-snapshot-backfill-idempotent-secret")
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId)
        val encryptedPayoutSnapshot = SecretsCipher.encrypt("""{"id":"already-encrypted"}""", fieldEncryptionKey)
        val invoiceId = ExposedTestDb.seedInvoice(clientId, currencyId, payoutSnapshot = encryptedPayoutSnapshot)
        val storedPayoutSnapshotBeforeBackfill = transaction { InvoiceEntity.findById(UUID.fromString(invoiceId))?.payoutSnapshot }

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "invoice-snapshot-backfill-idempotent-secret")
            }
            application {
                configureInvoicePayoutSnapshotEncryptionBackfill()
            }
        }

        val storedPayoutSnapshotAfterBackfill = transaction { InvoiceEntity.findById(UUID.fromString(invoiceId))?.payoutSnapshot }
        assertEquals(storedPayoutSnapshotBeforeBackfill, storedPayoutSnapshotAfterBackfill)
    }

    @Test
    fun `leaves an invoice without a payout snapshot untouched`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId)
        val invoiceId = ExposedTestDb.seedInvoice(clientId, currencyId, payoutSnapshot = null)

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "invoice-snapshot-backfill-null-secret")
            }
            application {
                configureInvoicePayoutSnapshotEncryptionBackfill()
            }
        }

        val storedInvoice = transaction { InvoiceEntity.findById(UUID.fromString(invoiceId)) }
        assertNull(storedInvoice?.payoutSnapshot)
    }
}
