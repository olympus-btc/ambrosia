package pos.ambrosia.utest

import org.mockito.Mockito.anyString
import org.mockito.kotlin.*
import pos.ambrosia.services.BaseCurrencyService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class BaseCurrencyTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getBaseCurrency returns currency ID when found`() {
        val expectedCurrencyId = "USD" // Arrange
        whenever(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement) // Arrange
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
        whenever(mockResultSet.next()).thenReturn(true) // Arrange
        whenever(mockResultSet.getString("id")).thenReturn(expectedCurrencyId)
        whenever(mockResultSet.getString("acronym")).thenReturn("US$")
        whenever(mockResultSet.getString("name")).thenReturn("US Dollar")
        whenever(mockResultSet.getString("symbol")).thenReturn("$")
        whenever(mockResultSet.getString("country_name")).thenReturn("United States")
        whenever(mockResultSet.getString("country_code")).thenReturn("US")

        val service = BaseCurrencyService(mockConnection) // Arrange
        val result = service.getBaseCurrency() // Act

        assertNotNull(result)
        assertEquals(expectedCurrencyId, result.currency_id) // Assert
    }

    @Test
    fun `getBaseCurrency returns Unknown when not found`() {
        whenever(mockConnection.prepareStatement(anyString())).thenReturn(mockStatement) // Arrange
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
        whenever(mockResultSet.next()).thenReturn(false) // Simulate not finding the currency
        val service = BaseCurrencyService(mockConnection) // Arrange
        val result = service.getBaseCurrency() // Act
        assertNull(result) // Assert
    }
}
