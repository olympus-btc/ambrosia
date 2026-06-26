package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.services.BaseCurrencyService
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class BaseCurrencyTest {
    private lateinit var dbFile: File
    private val service = BaseCurrencyService()
    private val currencyService = CurrencyService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getBaseCurrency returns currency when set`() {
        val currencyId = ExposedTestDb.seedCurrency("USD", "US Dollar", "$", "United States", "US")
        currencyService.setBaseCurrencyById(currencyId)

        val result = service.getBaseCurrency()

        assertNotNull(result)
        assertEquals(currencyId, result.currencyId)
        assertEquals("USD", result.acronym)
    }

    @Test
    fun `getBaseCurrency returns null when not set`() {
        val result = service.getBaseCurrency()
        assertNull(result)
    }
}
