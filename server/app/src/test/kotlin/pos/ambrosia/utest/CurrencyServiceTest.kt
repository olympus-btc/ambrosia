package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CurrencyServiceTest {
    private lateinit var dbFile: File
    private val service = CurrencyService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getByAcronym returns currency when found`() {
        val id = ExposedTestDb.seedCurrency("MXN", "Mexican Peso")

        val out = service.getByAcronym("MXN")

        assertNotNull(out)
        assertEquals(id, out.id)
        assertEquals("MXN", out.acronym)
    }

    @Test
    fun `getByAcronym returns null when not found`() {
        val out = service.getByAcronym("AAA")
        assertNull(out)
    }

    @Test
    fun `list returns currencies`() {
        ExposedTestDb.seedCurrency("MXN")
        ExposedTestDb.seedCurrency("USD")

        val list = service.list()

        assertEquals(2, list.size)
        assertEquals(setOf("MXN", "USD"), list.map { it.acronym }.toSet())
    }

    @Test
    fun `list returns empty when none`() {
        val list = service.list()
        assertTrue(list.isEmpty())
    }

    @Test
    fun `getBaseCurrency returns currency when set`() {
        val id = ExposedTestDb.seedCurrency("MXN")
        service.setBaseCurrencyById(id)

        val base = service.getBaseCurrency()

        assertNotNull(base)
        assertEquals("MXN", base.acronym)
    }

    @Test
    fun `getBaseCurrency returns null when not set`() {
        val base = service.getBaseCurrency()
        assertNull(base)
    }

    @Test
    fun `setBaseCurrencyById returns true on success`() {
        val id = ExposedTestDb.seedCurrency("MXN")
        assertTrue(service.setBaseCurrencyById(id))
    }

    @Test
    fun `setBaseCurrencyById replaces existing base currency`() {
        val first = ExposedTestDb.seedCurrency("MXN")
        val second = ExposedTestDb.seedCurrency("USD")
        service.setBaseCurrencyById(first)

        assertTrue(service.setBaseCurrencyById(second))

        assertEquals("USD", service.getBaseCurrency()?.acronym)
    }

    @Test
    fun `setBaseCurrencyByAcronym returns true when found`() {
        ExposedTestDb.seedCurrency("MXN")

        assertTrue(service.setBaseCurrencyByAcronym("MXN"))
        assertEquals("MXN", service.getBaseCurrency()?.acronym)
    }

    @Test
    fun `setBaseCurrencyByAcronym returns false when acronym unknown`() {
        assertFalse(service.setBaseCurrencyByAcronym("ZZZ"))
    }
}
