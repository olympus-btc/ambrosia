package pos.ambrosia.utest

import com.auth0.jwt.JWT
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.Date
import java.util.UUID
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TokenServiceTest {
    private val environment =
        applicationEnvironment {
            config =
                MapApplicationConfig(
                    "secret" to "test-secret",
                    "jwt.issuer" to "test-issuer",
                    "jwt.audience" to "test-audience",
                )
        }
    private val service = TokenService(environment)
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
    fun `generateWalletAccessToken persists token and expires in about 5 minutes`() {
        val userId = ExposedTestDb.seedUser("wallet-user")

        val token = service.generateWalletAccessToken(userId)

        val stored = transaction { UserEntity.findById(UUID.fromString(userId))?.walletToken }
        assertNotNull(stored)
        assertTrue(stored == token)

        val expiresAt = JWT.decode(token).expiresAt
        val now = System.currentTimeMillis()
        assertTrue(expiresAt.after(Date(now + TimeUnit.MINUTES.toMillis(4))))
        assertTrue(expiresAt.before(Date(now + TimeUnit.MINUTES.toMillis(5) + TimeUnit.SECONDS.toMillis(1))))
    }

    @Test
    fun `isWalletTokenValid returns true when token matches stored value`() {
        val userId = ExposedTestDb.seedUser("wallet-user")
        val token = service.generateWalletAccessToken(userId)

        val result = service.isWalletTokenValid(userId, token)

        assertTrue(result)
    }

    @Test
    fun `isWalletTokenValid returns false when token does not match`() {
        val userId = ExposedTestDb.seedUser("wallet-user")
        service.generateWalletAccessToken(userId)

        val result = service.isWalletTokenValid(userId, "stale-token")

        assertFalse(result)
    }

    @Test
    fun `revokeWalletToken clears the stored wallet token`() {
        val userId = ExposedTestDb.seedUser("wallet-user")
        service.generateWalletAccessToken(userId)

        service.revokeWalletToken(userId)

        val stored = transaction { UserEntity.findById(UUID.fromString(userId))?.walletToken }
        assertNull(stored)
    }
}
