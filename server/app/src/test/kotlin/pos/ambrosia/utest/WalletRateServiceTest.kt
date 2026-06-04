package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.WalletInvoiceRate
import pos.ambrosia.services.WalletRateService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WalletRateServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `saveInvoiceRate executes insert with all fields`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            val rate =
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = 100000L,
                    exchangeRate = 95000.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = 1.0,
                )
            val service = WalletRateService(mockConnection)
            service.saveInvoiceRate(rate)
            verify(mockStatement).setString(1, "hash-abc")
            verify(mockStatement).setLong(2, 100000L)
            verify(mockStatement).setDouble(3, 95000.0)
            verify(mockStatement).setString(4, "usd")
            verify(mockStatement).setDouble(5, 1.0)
            verify(mockStatement).executeUpdate()
        }
    }

    @Test
    fun `saveInvoiceRate sets null for optional fields when absent`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            val rate =
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = null,
                    exchangeRate = 95000.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = null,
                )
            val service = WalletRateService(mockConnection)
            service.saveInvoiceRate(rate)
            verify(mockStatement).setNull(2, java.sql.Types.INTEGER)
            verify(mockStatement).setNull(5, java.sql.Types.REAL)
        }
    }

    @Test
    fun `getRatesByPaymentHashes returns empty map when hashes list is empty`() {
        runBlocking {
            val service = WalletRateService(mockConnection)
            val result = service.getRatesByPaymentHashes(emptyList())
            assertTrue(result.isEmpty())
            verify(mockConnection, never()).prepareStatement(any())
        }
    }

    @Test
    fun `getRatesByPaymentHashes returns PaymentBitcoinData for matching hashes`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("payment_hash")).thenReturn("hash-abc")
            whenever(mockResultSet.getDouble("exchange_rate")).thenReturn(95000.0)
            whenever(mockResultSet.getString("exchange_rate_currency")).thenReturn("usd")
            whenever(mockResultSet.getObject("fiat_amount")).thenReturn(1.0)
            val service = WalletRateService(mockConnection)
            val result = service.getRatesByPaymentHashes(listOf("hash-abc"))
            assertEquals(1, result.size)
            assertEquals(95000.0, result["hash-abc"]?.exchangeRateAtPayment)
            assertEquals("usd", result["hash-abc"]?.exchangeRateCurrency)
            assertEquals(1.0, result["hash-abc"]?.fiatAmountAtPayment)
        }
    }

    @Test
    fun `getRatesByPaymentHashes returns null fiatAmount when not set`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("payment_hash")).thenReturn("hash-abc")
            whenever(mockResultSet.getDouble("exchange_rate")).thenReturn(95000.0)
            whenever(mockResultSet.getString("exchange_rate_currency")).thenReturn("usd")
            whenever(mockResultSet.getObject("fiat_amount")).thenReturn(null)
            val service = WalletRateService(mockConnection)
            val result = service.getRatesByPaymentHashes(listOf("hash-abc"))
            assertNull(result["hash-abc"]?.fiatAmountAtPayment)
        }
    }

    @Test
    fun `getRatesByPaymentHashes returns empty map when no matches found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)
            val service = WalletRateService(mockConnection)
            val result = service.getRatesByPaymentHashes(listOf("hash-unknown"))
            assertTrue(result.isEmpty())
        }
    }
}
