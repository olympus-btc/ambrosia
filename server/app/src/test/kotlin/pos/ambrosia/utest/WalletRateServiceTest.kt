package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.WalletInvoiceRate
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WalletRateServiceTest {
    private lateinit var dbFile: File
    private val service = WalletRateService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `saveInvoiceRate stores all fields`() =
        runBlocking {
            val rate =
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = 100000L,
                    exchangeRate = 95000.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = 1.0,
                )

            service.saveInvoiceRate(rate)

            val result = service.getRatesByPaymentHashes(listOf("hash-abc"))
            assertEquals(95000.0, result["hash-abc"]?.exchangeRateAtPayment)
            assertEquals("usd", result["hash-abc"]?.exchangeRateCurrency)
            assertEquals(1.0, result["hash-abc"]?.fiatAmountAtPayment)
        }

    @Test
    fun `saveInvoiceRate stores null for optional fields when absent`() =
        runBlocking {
            val rate =
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = null,
                    exchangeRate = 95000.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = null,
                )

            service.saveInvoiceRate(rate)

            val result = service.getRatesByPaymentHashes(listOf("hash-abc"))
            assertNull(result["hash-abc"]?.fiatAmountAtPayment)
        }

    @Test
    fun `saveInvoiceRate replaces existing rate for same payment hash`() =
        runBlocking {
            service.saveInvoiceRate(
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = 100L,
                    exchangeRate = 1.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = 1.0,
                ),
            )
            service.saveInvoiceRate(
                WalletInvoiceRate(
                    paymentHash = "hash-abc",
                    satoshiAmount = 200L,
                    exchangeRate = 2.0,
                    exchangeRateCurrency = "mxn",
                    fiatAmount = 2.0,
                ),
            )

            val result = service.getRatesByPaymentHashes(listOf("hash-abc"))
            assertEquals(1, result.size)
            assertEquals(2.0, result["hash-abc"]?.exchangeRateAtPayment)
            assertEquals("mxn", result["hash-abc"]?.exchangeRateCurrency)
        }

    @Test
    fun `getRatesByPaymentHashes returns empty map when hashes list is empty`() =
        runBlocking {
            val result = service.getRatesByPaymentHashes(emptyList())
            assertTrue(result.isEmpty())
        }

    @Test
    fun `getRatesByPaymentHashes returns empty map when no matches found`() =
        runBlocking {
            val result = service.getRatesByPaymentHashes(listOf("hash-unknown"))
            assertTrue(result.isEmpty())
        }
}
