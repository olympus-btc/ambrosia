package pos.ambrosia.utest

import com.auth0.jwt.JWT
import io.ktor.server.engine.applicationEnvironment
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.confirmationTokenConfig
import pos.ambrosia.utils.testJwtConfig
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
            config = testJwtConfig()
        }
    private val service = TokenService(environment)
    private lateinit var databaseFile: File

    private fun confirmationTokenService(secret: String): TokenService =
        TokenService(applicationEnvironment { config = confirmationTokenConfig(secret) })

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
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
    fun `generateBackupProgressToken embeds scope, userId, and operationId and expires in about 2 minutes`() {
        val userId = ExposedTestDb.seedUser("progress-user")

        val token = service.generateBackupProgressToken(userId, "operation-1")

        val decoded = JWT.decode(token)
        assertTrue(decoded.getClaim("scope").asString() == "backup_progress")
        assertTrue(decoded.getClaim("userId").asString() == userId)
        assertTrue(decoded.getClaim("operationId").asString() == "operation-1")

        val now = System.currentTimeMillis()
        assertTrue(decoded.expiresAt.after(Date(now + TimeUnit.MINUTES.toMillis(1))))
        assertTrue(decoded.expiresAt.before(Date(now + TimeUnit.MINUTES.toMillis(2) + TimeUnit.SECONDS.toMillis(1))))
    }

    @Test
    fun `getUserIdFromBackupProgressToken returns the userId when the token and operationId match`() {
        val userId = ExposedTestDb.seedUser("progress-user")
        val token = service.generateBackupProgressToken(userId, "operation-1")

        val resolvedUserId = service.getUserIdFromBackupProgressToken(token, "operation-1")

        assertTrue(resolvedUserId == userId)
    }

    @Test
    fun `getUserIdFromBackupProgressToken returns null when the operationId does not match`() {
        val userId = ExposedTestDb.seedUser("progress-user")
        val token = service.generateBackupProgressToken(userId, "operation-1")

        val resolvedUserId = service.getUserIdFromBackupProgressToken(token, "operation-2")

        assertNull(resolvedUserId)
    }

    @Test
    fun `getUserIdFromBackupProgressToken returns null for a token with a different scope`() {
        val userId = ExposedTestDb.seedUser("progress-user")
        val walletAccessToken = service.generateWalletAccessToken(userId)

        val resolvedUserId = service.getUserIdFromBackupProgressToken(walletAccessToken, "operation-1")

        assertNull(resolvedUserId)
    }

    @Test
    fun `generateBackupConfirmationToken embeds scope and operationId and expires in about 4 hours`() {
        val token = confirmationTokenService("confirmation-secret").generateBackupConfirmationToken("operation-1")

        val decoded = JWT.decode(token)
        assertTrue(decoded.getClaim("scope").asString() == "backup_confirmation")
        assertTrue(decoded.getClaim("operationId").asString() == "operation-1")

        val now = System.currentTimeMillis()
        assertTrue(decoded.expiresAt.after(Date(now + TimeUnit.HOURS.toMillis(3))))
        assertTrue(decoded.expiresAt.before(Date(now + TimeUnit.HOURS.toMillis(4) + TimeUnit.SECONDS.toMillis(1))))
    }

    @Test
    fun `isBackupConfirmationTokenValid returns true when the token and operationId match`() {
        val token = confirmationTokenService("confirmation-secret").generateBackupConfirmationToken("operation-1")

        val isValid = TokenService.isBackupConfirmationTokenValid("confirmation-secret", token, "operation-1")

        assertTrue(isValid)
    }

    @Test
    fun `isBackupConfirmationTokenValid returns false when the operationId does not match`() {
        val token = confirmationTokenService("confirmation-secret").generateBackupConfirmationToken("operation-1")

        val isValid = TokenService.isBackupConfirmationTokenValid("confirmation-secret", token, "operation-2")

        assertFalse(isValid)
    }

    @Test
    fun `isBackupConfirmationTokenValid returns false for a token with a different scope`() {
        val progressToken = confirmationTokenService("confirmation-secret").generateBackupProgressToken("user-1", "operation-1")

        val isValid = TokenService.isBackupConfirmationTokenValid("confirmation-secret", progressToken, "operation-1")

        assertFalse(isValid)
    }

    @Test
    fun `isBackupConfirmationTokenValid returns false when the token was signed with a different secret`() {
        val token = confirmationTokenService("confirmation-secret").generateBackupConfirmationToken("operation-1")

        val isValid = TokenService.isBackupConfirmationTokenValid("a-different-secret", token, "operation-1")

        assertFalse(isValid)
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

    @Test
    fun `revokeAllWalletTokens clears wallet tokens for every user`() {
        val firstUserId = ExposedTestDb.seedUser("wallet-user-1")
        val secondUserId = ExposedTestDb.seedUser("wallet-user-2")
        service.generateWalletAccessToken(firstUserId)
        service.generateWalletAccessToken(secondUserId)

        service.revokeAllWalletTokens()

        val firstStored = transaction { UserEntity.findById(UUID.fromString(firstUserId))?.walletToken }
        val secondStored = transaction { UserEntity.findById(UUID.fromString(secondUserId))?.walletToken }
        assertNull(firstStored)
        assertNull(secondStored)
    }
}
