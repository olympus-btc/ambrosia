package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.BaseCurrencyTable
import pos.ambrosia.db.tables.CurrencyEntity
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.models.Currency
import java.util.UUID

class CurrencyService {
    private fun toModel(entity: CurrencyEntity): Currency =
        Currency(
            id = entity.id.value.toString(),
            acronym = entity.acronym,
            name = entity.name,
            symbol = entity.symbol,
            countryName = entity.countryName,
            countryCode = entity.countryCode,
        )

    fun getByAcronym(acronym: String): Currency? =
        transaction {
            CurrencyEntity.find { CurrencyTable.acronym eq acronym }.firstOrNull()?.let { toModel(it) }
        }

    fun list(): List<Currency> =
        transaction {
            CurrencyEntity.all().map { toModel(it) }
        }

    fun setBaseCurrencyById(id: String): Boolean =
        transaction {
            val currencyId = EntityID(UUID.fromString(id), CurrencyTable)
            val updated = BaseCurrencyTable.update({ BaseCurrencyTable.id eq 1 }) { it[BaseCurrencyTable.currencyId] = currencyId }
            if (updated == 0) {
                BaseCurrencyTable.insert {
                    it[BaseCurrencyTable.id] = 1
                    it[BaseCurrencyTable.currencyId] = currencyId
                }
            }
            true
        }

    fun setBaseCurrencyByAcronym(acronym: String): Boolean {
        val currency = getByAcronym(acronym) ?: return false
        return setBaseCurrencyById(currency.id!!)
    }

    fun getBaseCurrency(): Currency? =
        transaction {
            (BaseCurrencyTable innerJoin CurrencyTable)
                .selectAll()
                .where { BaseCurrencyTable.id eq 1 }
                .firstOrNull()
                ?.let { row ->
                    Currency(
                        id = row[CurrencyTable.id].value.toString(),
                        acronym = row[CurrencyTable.acronym],
                        name = row[CurrencyTable.name],
                        symbol = row[CurrencyTable.symbol],
                        countryName = row[CurrencyTable.countryName],
                        countryCode = row[CurrencyTable.countryCode],
                    )
                }
        }
}
