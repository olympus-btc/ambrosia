package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Currency
import pos.ambrosia.models.Payment
import pos.ambrosia.models.PaymentMethod
import pos.ambrosia.services.PaymentService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class PaymentServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getPaymentMethods returns list of methods when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("pm-1").thenReturn("pm-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Cash").thenReturn("Credit Card") // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentMethods() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Cash", result[0].name) // Assert
        }
    }

    @Test
    fun `getPaymentMethods returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentMethods() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getPaymentMethodById returns method when found`() {
        runBlocking {
            val expectedMethod = PaymentMethod(id = "pm-1", name = "Cash") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedMethod.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedMethod.name) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentMethodById("pm-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedMethod, result) // Assert
        }
    }

    @Test
    fun `getPaymentMethodById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentMethodById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getCurrencies returns list of currencies when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("cur-1").thenReturn("cur-2") // Arrange
            whenever(mockResultSet.getString("acronym")).thenReturn("USD").thenReturn("EUR") // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getCurrencies() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("USD", result[0].acronym) // Assert
        }
    }

    @Test
    fun `getCurrencies returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getCurrencies() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getCurrencyById returns currency when found`() {
        runBlocking {
            val expectedCurrency = Currency(id = "cur-1", acronym = "USD") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedCurrency.id) // Arrange
            whenever(mockResultSet.getString("acronym")).thenReturn(expectedCurrency.acronym) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getCurrencyById("cur-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedCurrency, result) // Assert
        }
    }

    @Test
    fun `getCurrencyById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getCurrencyById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addPayment returns null if method_id is blank`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `addPayment returns null if currency_id is blank`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "pm-1", currency_id = "", transaction_id = "txn-1", amount = 100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `addPayment returns null if method_id does not exist`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "non-existent-pm", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0)
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addPayment returns null if currency_id does not exist`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "pm-1", currency_id = "non-existent-cur", transaction_id = "txn-1", amount = 100.0)
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(false) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addPayment returns new ID on success`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "pm-1", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0) // Arrange
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            val addPaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(addPaymentStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(true) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            whenever(addPaymentStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNotNull(result) // Assert
        }
    }

    @Test
    fun `addPayment returns null when database insert fails`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "pm-1", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0) // Arrange
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            val addPaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(addPaymentStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(true) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            whenever(addPaymentStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.addPayment(payment) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getPayments returns list of payments when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("pay-1") // Arrange
            whenever(mockResultSet.getString("method_id")).thenReturn("pm-1") // Arrange
            whenever(mockResultSet.getString("currency_id")).thenReturn("cur-1") // Arrange
            whenever(mockResultSet.getString("transaction_id")).thenReturn("txn-1") // Arrange
            whenever(mockResultSet.getDouble("amount")).thenReturn(100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPayments() // Act
            assertEquals(1, result.size) // Assert
            assertEquals("pay-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getPayments returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPayments() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getPaymentById returns payment when found`() {
        runBlocking {
            val expectedPayment = Payment("pay-1", "pm-1", "cur-1", "txn-1", 100.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedPayment.id) // Arrange
            whenever(mockResultSet.getString("method_id")).thenReturn(expectedPayment.method_id) // Arrange
            whenever(mockResultSet.getString("currency_id")).thenReturn(expectedPayment.currency_id) // Arrange
            whenever(mockResultSet.getString("transaction_id")).thenReturn(expectedPayment.transaction_id) // Arrange
            whenever(mockResultSet.getDouble("amount")).thenReturn(expectedPayment.amount) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentById("pay-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedPayment, result) // Assert
        }
    }

    @Test
    fun `getPaymentById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.getPaymentById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updatePayment returns false if ID is null`() {
        runBlocking {
            val payment = Payment(id = null, method_id = "pm-1", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updatePayment returns false if method_id is blank`() {
        runBlocking {
            val payment = Payment(id = "pay-1", method_id = "", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updatePayment returns false if currency_id is blank`() {
        runBlocking {
            val payment = Payment(id = "pay-1", method_id = "pm-1", currency_id = "", transaction_id = "txn-1", amount = 100.0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updatePayment returns false if method_id does not exist`() {
        runBlocking {
            val payment =
                Payment(id = "pay-1", method_id = "non-existent-pm", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0)
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updatePayment returns false if currency_id does not exist`() {
        runBlocking {
            val payment =
                Payment(id = "pay-1", method_id = "pm-1", currency_id = "non-existent-cur", transaction_id = "txn-1", amount = 100.0)
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(false) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updatePayment returns true on success`() {
        runBlocking {
            val payment = Payment(id = "pay-1", method_id = "pm-1", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0)
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            val updatePaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE payments"))).thenReturn(updatePaymentStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(true) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            whenever(updatePaymentStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updatePayment returns false when database update fails`() {
        runBlocking {
            val payment = Payment(id = "pay-1", method_id = "pm-1", currency_id = "cur-1", transaction_id = "txn-1", amount = 100.0)
            val methodCheckStatement: PreparedStatement = mock() // Arrange
            val currencyCheckStatement: PreparedStatement = mock() // Arrange
            val updatePaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("payment_methods"))).thenReturn(methodCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("currency"))).thenReturn(currencyCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE payments"))).thenReturn(updatePaymentStatement) // Arrange
            val methodResultSet: ResultSet = mock() // Arrange
            whenever(methodResultSet.next()).thenReturn(true) // Arrange
            whenever(methodCheckStatement.executeQuery()).thenReturn(methodResultSet) // Arrange
            val currencyResultSet: ResultSet = mock() // Arrange
            whenever(currencyResultSet.next()).thenReturn(true) // Arrange
            whenever(currencyCheckStatement.executeQuery()).thenReturn(currencyResultSet) // Arrange
            whenever(updatePaymentStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.updatePayment(payment) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deletePayment returns false if payment is in use`() {
        runBlocking {
            val paymentId = "pay-1" // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getInt("count")).thenReturn(1) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.deletePayment(paymentId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("DELETE FROM payments")) // Assert
        }
    }

    @Test
    fun `deletePayment returns true on success`() {
        runBlocking {
            val paymentId = "pay-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("DELETE FROM payments"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.deletePayment(paymentId) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deletePayment returns false when payment not found`() {
        runBlocking {
            val paymentId = "not-found-pay" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("DELETE FROM payments"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = PaymentService(mockConnection) // Arrange
            val result = service.deletePayment(paymentId) // Act
            assertFalse(result) // Assert
        }
    }
}
