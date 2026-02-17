package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Config
import pos.ambrosia.services.ConfigService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ConfigServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    // Helper function to set up all the mock behavior for a successful `getConfig` call.
    private fun setupGetConfigMock(config: Config) {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true)
        whenever(mockResultSet.getInt("id")).thenReturn(config.id)
        whenever(mockResultSet.getString("business_type")).thenReturn(config.businessType)
        whenever(mockResultSet.getString("business_name")).thenReturn(config.businessName)
        whenever(mockResultSet.getString("business_address")).thenReturn(config.businessAddress)
        whenever(mockResultSet.getString("business_phone")).thenReturn(config.businessPhone)
        whenever(mockResultSet.getString("business_email")).thenReturn(config.businessEmail)
        whenever(mockResultSet.getString("business_tax_id")).thenReturn(config.businessTaxId)
        whenever(mockResultSet.getString("business_logo_url")).thenReturn(config.businessLogoUrl)
        whenever(mockResultSet.getBoolean("business_type_confirmed")).thenReturn(config.businessTypeConfirmed)
    }

    // Helper function to set up mock behavior for when `getConfig` finds no data.
    private fun setupGetConfigToReturnNull() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)
    }

    @Test
    fun `getConfig returns config when found`() =
        runBlocking {
            val expectedConfig = Config(1, "restaurant", "Test Cafe", "123 Lane", "555", "a@b.com", "T123", null, true) // Arrange
            setupGetConfigMock(expectedConfig) // Arrange
            val service = ConfigService(mockConnection) // Arrange
            val result = service.getConfig() // Act
            assertEquals(expectedConfig, result) // Assert
        }

    @Test
    fun `getConfig returns null when not found`() =
        runBlocking {
            setupGetConfigToReturnNull() // Arrange
            val service = ConfigService(mockConnection) // Arrange
            val result = service.getConfig() // Act
            assertNull(result) // Assert
        }

    @Test
    fun `updateConfig returns true on success`() =
        runBlocking {
            val configToUpdate = Config(1, "restaurant", "New Name", "", "", "", "", null) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ConfigService(mockConnection) // Arrange
            val result = service.updateConfig(configToUpdate) // Act
            assertTrue(result) // Assert
        }

    @Test
    fun `updateConfig returns false when database update fails`() =
        runBlocking {
            val configToUpdate = Config(1, "restaurant", "New Name", "", "", "", "", null) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ConfigService(mockConnection) // Arrange
            val result = service.updateConfig(configToUpdate) // Act
            assertFalse(result) // Assert
        }
}
