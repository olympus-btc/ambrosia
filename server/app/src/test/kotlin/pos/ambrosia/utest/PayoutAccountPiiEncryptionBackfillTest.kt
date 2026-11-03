package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.testing.testApplication
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.configurePayoutAccountPiiEncryptionBackfill
import pos.ambrosia.db.tables.PayoutAccountEntity
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.SecretsCipher
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class PayoutAccountPiiEncryptionBackfillTest {
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
    fun `encrypts plaintext legacy bank fields left over from before this feature`() {
        val payoutAccountId =
            ExposedTestDb.seedPayoutAccount(
                accountHolder = "Jane Doe",
                bankName = "Acme Bank",
                accountNumber = "1234567890",
                swift = "ACMEUS33XXX",
                iban = "DE89370400440532013000",
                clabe = "032180000118359719",
                lightningAddress = "jane@getalby.com",
            )

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "payout-backfill-legacy-secret")
            }
            application {
                configurePayoutAccountPiiEncryptionBackfill()
            }
        }

        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("payout-backfill-legacy-secret")
        val storedPayoutAccount = transaction { PayoutAccountEntity.findById(UUID.fromString(payoutAccountId)) }
        assertNotEquals("Jane Doe", storedPayoutAccount?.accountHolder)
        assertEquals("Jane Doe", SecretsCipher.decryptOrNull(storedPayoutAccount?.accountHolder, fieldEncryptionKey))
        assertEquals("Acme Bank", SecretsCipher.decryptOrNull(storedPayoutAccount?.bankName, fieldEncryptionKey))
        assertEquals("1234567890", SecretsCipher.decryptOrNull(storedPayoutAccount?.accountNumber, fieldEncryptionKey))
        assertEquals("ACMEUS33XXX", SecretsCipher.decryptOrNull(storedPayoutAccount?.swift, fieldEncryptionKey))
        assertEquals("DE89370400440532013000", SecretsCipher.decryptOrNull(storedPayoutAccount?.iban, fieldEncryptionKey))
        assertEquals("032180000118359719", SecretsCipher.decryptOrNull(storedPayoutAccount?.clabe, fieldEncryptionKey))
        assertEquals("jane@getalby.com", SecretsCipher.decryptOrNull(storedPayoutAccount?.lightningAddress, fieldEncryptionKey))
    }

    @Test
    fun `does not re-encrypt bank fields that are already encrypted`() {
        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("payout-backfill-idempotent-secret")
        val payoutAccountId =
            ExposedTestDb.seedPayoutAccount(
                accountHolder = SecretsCipher.encrypt("Already Encrypted", fieldEncryptionKey),
            )
        val storedAccountHolderBeforeBackfill =
            transaction { PayoutAccountEntity.findById(UUID.fromString(payoutAccountId))?.accountHolder }

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "payout-backfill-idempotent-secret")
            }
            application {
                configurePayoutAccountPiiEncryptionBackfill()
            }
        }

        val storedAccountHolderAfterBackfill =
            transaction { PayoutAccountEntity.findById(UUID.fromString(payoutAccountId))?.accountHolder }
        assertEquals(storedAccountHolderBeforeBackfill, storedAccountHolderAfterBackfill)
    }

    @Test
    fun `leaves a lightning payout account without bank fields untouched`() {
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(type = "lightning", lightningAddress = null)

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "payout-backfill-null-secret")
            }
            application {
                configurePayoutAccountPiiEncryptionBackfill()
            }
        }

        val storedPayoutAccount = transaction { PayoutAccountEntity.findById(UUID.fromString(payoutAccountId)) }
        assertNull(storedPayoutAccount?.accountHolder)
        assertNull(storedPayoutAccount?.lightningAddress)
    }
}
