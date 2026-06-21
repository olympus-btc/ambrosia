package pos.ambrosia.utest

import com.auth0.jwt.JWT
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.services.TokenService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.util.Date
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TokenServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    private val environment =
        applicationEnvironment {
            config =
                MapApplicationConfig(
                    "secret" to "test-secret",
                    "jwt.issuer" to "test-issuer",
                    "jwt.audience" to "test-audience",
                )
        }

    @Test
    fun `generateWalletAccessToken persists token and expires in about 5 minutes`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
        val service = TokenService(environment, mockConnection) // Arrange

        val token = service.generateWalletAccessToken("user-1") // Act

        verify(mockStatement).setString(1, token) // Assert
        verify(mockStatement).setString(2, "user-1") // Assert
        verify(mockStatement).executeUpdate() // Assert

        val expiresAt = JWT.decode(token).expiresAt
        val now = System.currentTimeMillis()
        assertTrue(expiresAt.after(Date(now + TimeUnit.MINUTES.toMillis(4)))) // Assert
        assertTrue(expiresAt.before(Date(now + TimeUnit.MINUTES.toMillis(5) + TimeUnit.SECONDS.toMillis(1)))) // Assert
    }

    @Test
    fun `isWalletTokenValid returns true when token matches stored value`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
        whenever(mockResultSet.next()).thenReturn(true) // Arrange
        val service = TokenService(environment, mockConnection) // Arrange

        val result = service.isWalletTokenValid("user-1", "some-token") // Act

        assertTrue(result) // Assert
    }

    @Test
    fun `isWalletTokenValid returns false when no row matches`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
        whenever(mockResultSet.next()).thenReturn(false) // Arrange
        val service = TokenService(environment, mockConnection) // Arrange

        val result = service.isWalletTokenValid("user-1", "stale-token") // Act

        assertFalse(result) // Assert
    }

    @Test
    fun `revokeWalletToken clears the stored wallet token`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
        val service = TokenService(environment, mockConnection) // Arrange

        service.revokeWalletToken("user-1") // Act

        verify(mockStatement).setString(1, "user-1") // Assert
        verify(mockStatement).executeUpdate() // Assert
    }
}
