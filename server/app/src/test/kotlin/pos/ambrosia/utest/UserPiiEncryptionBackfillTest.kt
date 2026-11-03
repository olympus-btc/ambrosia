package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.testing.testApplication
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.configureUserPiiEncryptionBackfill
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.SecretsCipher
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull

class UserPiiEncryptionBackfillTest {
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
    fun `encrypts plaintext legacy email and phone left over from before this feature`() {
        val userId = ExposedTestDb.seedUser("legacy-user", email = "legacy-user@example.com", phone = "+1-555-0199")

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "backfill-legacy-secret")
            }
            application {
                configureUserPiiEncryptionBackfill()
            }
        }

        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("backfill-legacy-secret")
        val storedUser = transaction { UserEntity.findById(UUID.fromString(userId)) }
        assertNotEquals("legacy-user@example.com", storedUser?.email)
        assertEquals("legacy-user@example.com", SecretsCipher.decryptOrNull(storedUser?.email, fieldEncryptionKey))
        assertEquals("+1-555-0199", SecretsCipher.decryptOrNull(storedUser?.phone, fieldEncryptionKey))
    }

    @Test
    fun `does not re-encrypt an email and phone that are already encrypted`() {
        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("backfill-idempotent-secret")
        val userId =
            ExposedTestDb.seedUser(
                "already-encrypted-user",
                email = SecretsCipher.encrypt("already-encrypted-user@example.com", fieldEncryptionKey),
                phone = SecretsCipher.encrypt("+1-555-0198", fieldEncryptionKey),
            )
        val storedEmailBeforeBackfill = transaction { UserEntity.findById(UUID.fromString(userId))?.email }

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "backfill-idempotent-secret")
            }
            application {
                configureUserPiiEncryptionBackfill()
            }
        }

        val storedEmailAfterBackfill = transaction { UserEntity.findById(UUID.fromString(userId))?.email }
        assertEquals(storedEmailBeforeBackfill, storedEmailAfterBackfill)
    }

    @Test
    fun `leaves a user without an email or phone untouched`() {
        val userId = ExposedTestDb.seedUser("no-contact-info-user")

        testApplication {
            environment {
                config = MapApplicationConfig("secret" to "backfill-null-secret")
            }
            application {
                configureUserPiiEncryptionBackfill()
            }
        }

        val storedUser = transaction { UserEntity.findById(UUID.fromString(userId)) }
        assertNull(storedUser?.email)
        assertNull(storedUser?.phone)
    }
}
