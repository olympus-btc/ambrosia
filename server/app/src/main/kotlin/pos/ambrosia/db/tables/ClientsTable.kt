package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object ClientsTable : SQLiteUUIDTable("clients") {
    val name = varchar("name", 255)
    val currencyId = reference("currency_id", CurrencyTable)
    val hourlyRateCents = integer("hourly_rate_cents")
    val billingCycle = varchar("billing_cycle", 20)
    val paymentMethod = varchar("payment_method", 20)
    val payoutAccountId = optReference("payout_account_id", PayoutAccountsTable)
    val isDeleted = bool("is_deleted").default(false)
    val createdAt = varchar("created_at", 50)
}

class ClientEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ClientEntity>(ClientsTable)

    var name by ClientsTable.name
    var currencyId by ClientsTable.currencyId
    var hourlyRateCents by ClientsTable.hourlyRateCents
    var billingCycle by ClientsTable.billingCycle
    var paymentMethod by ClientsTable.paymentMethod
    var payoutAccountId by ClientsTable.payoutAccountId
    var isDeleted by ClientsTable.isDeleted
    var createdAt by ClientsTable.createdAt
}

object ClientPaymentMethodsTable : Table("client_payment_methods") {
    val clientId = reference("client_id", ClientsTable)
    val paymentMethod = varchar("payment_method", 20)
    val displayOrder = integer("display_order").default(0)

    override val primaryKey = PrimaryKey(clientId, paymentMethod)
}
