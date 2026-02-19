package pos.ambrosia.utest

import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Currency
import pos.ambrosia.services.CurrencyService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CurrencyServiceTest {
    private val conn: Connection = mock()
    private val st: PreparedStatement = mock()
    private val rs: ResultSet = mock()

    @Test
    fun `getByAcronym returns currency when found`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(true)
        whenever(rs.getString("id")).thenReturn("cur-1")
        whenever(rs.getString("acronym")).thenReturn("MXN")

        val service = CurrencyService(conn)
        val out = service.getByAcronym("MXN")
        assertNotNull(out)
        assertEquals(Currency(id = "cur-1", acronym = "MXN"), out)
    }

    @Test
    fun `getByAcronym returns null when not found`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(false)

        val service = CurrencyService(conn)
        val out = service.getByAcronym("AAA")
        assertNull(out)
    }

    @Test
    fun `list returns currencies`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(true, true, false)
        whenever(rs.getString("id")).thenReturn("cur-1", "cur-2")
        whenever(rs.getString("acronym")).thenReturn("MXN", "USD")

        val service = CurrencyService(conn)
        val list = service.list()
        assertEquals(2, list.size)
        assertEquals("MXN", list[0].acronym)
    }

    @Test
    fun `list returns empty when none`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(false)

        val service = CurrencyService(conn)
        val list = service.list()
        assertTrue(list.isEmpty())
    }

    @Test
    fun `getBaseCurrency returns currency when set`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(true)
        whenever(rs.getString("id")).thenReturn("cur-1")
        whenever(rs.getString("acronym")).thenReturn("MXN")

        val service = CurrencyService(conn)
        val base = service.getBaseCurrency()
        assertNotNull(base)
        assertEquals("MXN", base.acronym)
    }

    @Test
    fun `getBaseCurrency returns null when not set`() {
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(false)

        val service = CurrencyService(conn)
        val base = service.getBaseCurrency()
        assertNull(base)
    }

    @Test
    fun `setBaseCurrencyById returns true on success`() {
        val upsertSt: PreparedStatement = mock()
        whenever(conn.prepareStatement(contains("INSERT OR REPLACE INTO base_currency"))).thenReturn(upsertSt)
        whenever(upsertSt.executeUpdate()).thenReturn(1)

        val service = CurrencyService(conn)
        assertTrue(service.setBaseCurrencyById("cur-1"))
    }

    @Test
    fun `setBaseCurrencyById returns false when update fails`() {
        val upsertSt: PreparedStatement = mock()
        whenever(conn.prepareStatement(contains("INSERT OR REPLACE INTO base_currency"))).thenReturn(upsertSt)
        whenever(upsertSt.executeUpdate()).thenReturn(0)

        val service = CurrencyService(conn)
        assertFalse(service.setBaseCurrencyById("cur-1"))
    }

    @Test
    fun `setBaseCurrencyByAcronym returns true when found`() {
        val selectSt: PreparedStatement = mock()
        val upsertSt: PreparedStatement = mock()
        val rsLocal: ResultSet = mock()
        whenever(conn.prepareStatement(contains("FROM currency"))).thenReturn(selectSt)
        whenever(conn.prepareStatement(contains("INSERT OR REPLACE INTO base_currency"))).thenReturn(upsertSt)
        whenever(selectSt.executeQuery()).thenReturn(rsLocal)
        whenever(rsLocal.next()).thenReturn(true)
        whenever(rsLocal.getString("id")).thenReturn("cur-1")
        whenever(rsLocal.getString("acronym")).thenReturn("MXN")
        whenever(upsertSt.executeUpdate()).thenReturn(1)

        val service = CurrencyService(conn)
        assertTrue(service.setBaseCurrencyByAcronym("MXN"))
    }

    @Test
    fun `setBaseCurrencyByAcronym returns false when acronym unknown`() {
        val selectSt: PreparedStatement = mock()
        val rsLocal: ResultSet = mock()
        whenever(conn.prepareStatement(contains("FROM currency"))).thenReturn(selectSt)
        whenever(selectSt.executeQuery()).thenReturn(rsLocal)
        whenever(rsLocal.next()).thenReturn(false)

        val service = CurrencyService(conn)
        assertFalse(service.setBaseCurrencyByAcronym("ZZZ"))
    }
}
