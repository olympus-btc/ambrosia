package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Payment
import pos.ambrosia.services.PaymentService
import pos.ambrosia.util.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PaymentServiceTest {
    private lateinit var dbFile: File
    private val service = PaymentService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getPaymentMethods returns list of methods when found`() {
        runBlocking {
            ExposedTestDb.seedPaymentMethod("Cash")
            ExposedTestDb.seedPaymentMethod("Credit Card")

            val result = service.getPaymentMethods()
            assertEquals(2, result.size)
            assertTrue(result.any { it.name == "Cash" })
            assertTrue(result.any { it.name == "Credit Card" })
        }
    }

    @Test
    fun `getPaymentMethods returns empty list when none found`() {
        runBlocking {
            val result = service.getPaymentMethods()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getPaymentMethodById returns method when found`() {
        runBlocking {
            val id = ExposedTestDb.seedPaymentMethod("Cash")
            val result = service.getPaymentMethodById(id)
            assertNotNull(result)
            assertEquals("Cash", result.name)
        }
    }

    @Test
    fun `getPaymentMethodById returns null when not found`() {
        runBlocking {
            val result = service.getPaymentMethodById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getCurrencies returns list of currencies when found`() {
        runBlocking {
            ExposedTestDb.seedCurrency("USD")
            ExposedTestDb.seedCurrency("EUR")

            val result = service.getCurrencies()
            assertEquals(2, result.size)
            assertTrue(result.any { it.acronym == "USD" })
            assertTrue(result.any { it.acronym == "EUR" })
        }
    }

    @Test
    fun `getCurrencies returns empty list when none found`() {
        runBlocking {
            val result = service.getCurrencies()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getCurrencyById returns currency when found`() {
        runBlocking {
            val id = ExposedTestDb.seedCurrency("USD")
            val result = service.getCurrencyById(id)
            assertNotNull(result)
            assertEquals("USD", result.acronym)
        }
    }

    @Test
    fun `getCurrencyById returns null when not found`() {
        runBlocking {
            val result = service.getCurrencyById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `addPayment returns null if method_id is blank`() {
        runBlocking {
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val payment = Payment(id = null, methodId = "", currencyId = currencyId, transactionId = "txn-1", amount = 100.0)
            val result = service.addPayment(payment)
            assertNull(result)
        }
    }

    @Test
    fun `addPayment returns null if currency_id is blank`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val payment = Payment(id = null, methodId = methodId, currencyId = "", transactionId = "txn-1", amount = 100.0)
            val result = service.addPayment(payment)
            assertNull(result)
        }
    }

    @Test
    fun `addPayment returns null if method_id does not exist`() {
        runBlocking {
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val payment =
                Payment(
                    id = null,
                    methodId = UUID.randomUUID().toString(),
                    currencyId = currencyId,
                    transactionId = "txn-1",
                    amount = 100.0,
                )
            val result = service.addPayment(payment)
            assertNull(result)
        }
    }

    @Test
    fun `addPayment returns null if currency_id does not exist`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val payment =
                Payment(
                    id = null,
                    methodId = methodId,
                    currencyId = UUID.randomUUID().toString(),
                    transactionId = "txn-1",
                    amount = 100.0,
                )
            val result = service.addPayment(payment)
            assertNull(result)
        }
    }

    @Test
    fun `addPayment returns new ID on success`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val payment = Payment(id = null, methodId = methodId, currencyId = currencyId, transactionId = "txn-1", amount = 100.0)
            val result = service.addPayment(payment)
            assertNotNull(result)
        }
    }

    @Test
    fun `getPayments returns list of payments when found`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)

            val result = service.getPayments()
            assertEquals(1, result.size)
            assertEquals(paymentId, result[0].id)
        }
    }

    @Test
    fun `getPayments returns empty list when none found`() {
        runBlocking {
            val result = service.getPayments()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getPaymentById returns payment when found`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId, transactionId = "txn-1", amount = 100.0)

            val result = service.getPaymentById(paymentId)
            assertNotNull(result)
            assertEquals(paymentId, result.id)
            assertEquals(methodId, result.methodId)
            assertEquals(currencyId, result.currencyId)
            assertEquals("txn-1", result.transactionId)
            assertEquals(100.0, result.amount)
        }
    }

    @Test
    fun `getPaymentById returns null when not found`() {
        runBlocking {
            val result = service.getPaymentById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `updatePayment returns false if ID is null`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val payment = Payment(id = null, methodId = methodId, currencyId = currencyId, transactionId = "txn-1", amount = 100.0)
            val result = service.updatePayment(payment)
            assertFalse(result)
        }
    }

    @Test
    fun `updatePayment returns false if method_id is blank`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)
            val payment = Payment(id = paymentId, methodId = "", currencyId = currencyId, transactionId = "txn-1", amount = 100.0)
            val result = service.updatePayment(payment)
            assertFalse(result)
        }
    }

    @Test
    fun `updatePayment returns false if currency_id is blank`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)
            val payment = Payment(id = paymentId, methodId = methodId, currencyId = "", transactionId = "txn-1", amount = 100.0)
            val result = service.updatePayment(payment)
            assertFalse(result)
        }
    }

    @Test
    fun `updatePayment returns false if method_id does not exist`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)
            val payment =
                Payment(
                    id = paymentId,
                    methodId = UUID.randomUUID().toString(),
                    currencyId = currencyId,
                    transactionId = "txn-1",
                    amount = 100.0,
                )
            val result = service.updatePayment(payment)
            assertFalse(result)
        }
    }

    @Test
    fun `updatePayment returns false if currency_id does not exist`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)
            val payment =
                Payment(
                    id = paymentId,
                    methodId = methodId,
                    currencyId = UUID.randomUUID().toString(),
                    transactionId = "txn-1",
                    amount = 100.0,
                )
            val result = service.updatePayment(payment)
            assertFalse(result)
        }
    }

    @Test
    fun `updatePayment returns true on success`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId, amount = 100.0)
            val payment = Payment(id = paymentId, methodId = methodId, currencyId = currencyId, transactionId = "txn-2", amount = 200.0)

            val result = service.updatePayment(payment)
            assertTrue(result)
            val updated = service.getPaymentById(paymentId)
            assertEquals(200.0, updated?.amount)
            assertEquals("txn-2", updated?.transactionId)
        }
    }

    @Test
    fun `deletePayment returns false if payment is in use`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)
            ExposedTestDb.seedTicketPayment(paymentId, ticketId)

            val result = service.deletePayment(paymentId)
            assertFalse(result)
        }
    }

    @Test
    fun `deletePayment returns true on success`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId = ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)

            val result = service.deletePayment(paymentId)
            assertTrue(result)
            assertNull(service.getPaymentById(paymentId))
        }
    }

    @Test
    fun `deletePayment returns false when payment not found`() {
        runBlocking {
            val result = service.deletePayment(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `getExchangeRatesByPaymentHashes returns empty map when hashes list is empty`() {
        runBlocking {
            val result = service.getExchangeRatesByPaymentHashes(emptyList())
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getExchangeRatesByPaymentHashes returns PaymentBitcoinData with all fields when found`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            ExposedTestDb.seedPayment(
                methodId = methodId,
                currencyId = currencyId,
                paymentHash = "hash1",
                exchangeRateAtPayment = 95000.0,
                exchangeRateCurrency = "usd",
                fiatAmountAtPayment = 1.0,
            )

            val result = service.getExchangeRatesByPaymentHashes(listOf("hash1"))
            assertEquals(1, result.size)
            assertEquals(95000.0, result["hash1"]?.exchangeRateAtPayment)
            assertEquals("usd", result["hash1"]?.exchangeRateCurrency)
            assertEquals(1.0, result["hash1"]?.fiatAmountAtPayment)
        }
    }

    @Test
    fun `getExchangeRatesByPaymentHashes returns PaymentBitcoinData with null optional fields`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            ExposedTestDb.seedPayment(
                methodId = methodId,
                currencyId = currencyId,
                paymentHash = "hash1",
                exchangeRateAtPayment = 95000.0,
                exchangeRateCurrency = null,
                fiatAmountAtPayment = null,
            )

            val result = service.getExchangeRatesByPaymentHashes(listOf("hash1"))
            val btcData = result["hash1"]
            assertNotNull(btcData)
            assertEquals(95000.0, btcData.exchangeRateAtPayment)
            assertNull(btcData.exchangeRateCurrency)
            assertNull(btcData.fiatAmountAtPayment)
        }
    }

    @Test
    fun `getExchangeRatesByPaymentHashes returns empty map when no matches found`() {
        runBlocking {
            val methodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            ExposedTestDb.seedPayment(methodId = methodId, currencyId = currencyId)

            val result = service.getExchangeRatesByPaymentHashes(listOf("hash-unknown"))
            assertTrue(result.isEmpty())
        }
    }
}
