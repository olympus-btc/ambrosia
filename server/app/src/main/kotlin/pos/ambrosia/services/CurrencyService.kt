package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Currency
import java.sql.Connection

class CurrencyService(
    private val connection: Connection,
) {
    companion object {
        private const val SELECT_BY_ACRONYM = "SELECT id, acronym, name, symbol, country_name, country_code FROM currency WHERE acronym = ?"
        private const val SELECT_ALL = "SELECT id, acronym, name, symbol, country_name, country_code FROM currency"
        private const val UPSERT_BASE = "INSERT OR REPLACE INTO base_currency (id, currency_id) VALUES (1, ?)"
        private const val SELECT_BASE_JOIN =
            """
      SELECT c.id, c.acronym, c.name, c.symbol, c.country_name, c.country_code
      FROM base_currency b
      JOIN currency c ON c.id = b.currency_id
      WHERE b.id = 1
      """
    }

    fun getByAcronym(acronym: String): Currency? {
        connection.prepareStatement(SELECT_BY_ACRONYM).use { st ->
            st.setString(1, acronym)
            val rs = st.executeQuery()
            return if (rs.next()) {
                Currency(
                    id = rs.getString("id"),
                    acronym = rs.getString("acronym"),
                    name = rs.getString("name"),
                    symbol = rs.getString("symbol"),
                    country_name = rs.getString("country_name"),
                    country_code = rs.getString("country_code"),
                )
            } else {
                null
            }
        }
    }

    fun list(): List<Currency> {
        val out = mutableListOf<Currency>()
        connection.prepareStatement(SELECT_ALL).use { st ->
            val rs = st.executeQuery()
            while (rs.next()) {
                out.add(
                    Currency(
                        id = rs.getString("id"),
                        acronym = rs.getString("acronym"),
                        name = rs.getString("name"),
                        symbol = rs.getString("symbol"),
                        country_name = rs.getString("country_name"),
                        country_code = rs.getString("country_code"),
                    ),
                )
            }
        }
        return out
    }

    fun setBaseCurrencyById(id: String): Boolean {
        connection.prepareStatement(UPSERT_BASE).use { st ->
            st.setString(1, id)
            val n = st.executeUpdate()
            if (n <= 0) logger.error("Failed to upsert base currency with id=$id")
            return n > 0
        }
    }

    fun setBaseCurrencyByAcronym(acronym: String): Boolean {
        val c = getByAcronym(acronym) ?: return false
        return setBaseCurrencyById(c.id!!)
    }

    fun getBaseCurrency(): Currency? {
        connection.prepareStatement(SELECT_BASE_JOIN).use { st ->
            val rs = st.executeQuery()
            return if (rs.next()) {
                Currency(
                    id = rs.getString("id"),
                    acronym = rs.getString("acronym"),
                    name = rs.getString("name"),
                    symbol = rs.getString("symbol"),
                    country_name = rs.getString("country_name"),
                    country_code = rs.getString("country_code"),
                )
            } else {
                null
            }
        }
    }
}
