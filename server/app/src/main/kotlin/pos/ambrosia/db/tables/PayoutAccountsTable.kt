package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object PayoutAccountsTable : SQLiteUUIDTable("payout_accounts") {
    val type = varchar("type", 20)
    val accountHolder = text("account_holder").nullable()
    val bankName = text("bank_name").nullable()
    val accountNumber = text("account_number").nullable()
    val currencyId = optReference("currency_id", CurrencyTable)
    val swift = text("swift").nullable()
    val iban = text("iban").nullable()
    val clabe = text("clabe").nullable()
    val lightningAddress = text("lightning_address").nullable()
    val isDeleted = bool("is_deleted").default(false)
    val createdAt = varchar("created_at", 50)
}

class PayoutAccountEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PayoutAccountEntity>(PayoutAccountsTable)

    var type by PayoutAccountsTable.type
    var accountHolder by PayoutAccountsTable.accountHolder
    var bankName by PayoutAccountsTable.bankName
    var accountNumber by PayoutAccountsTable.accountNumber
    var currencyId by PayoutAccountsTable.currencyId
    var swift by PayoutAccountsTable.swift
    var iban by PayoutAccountsTable.iban
    var clabe by PayoutAccountsTable.clabe
    var lightningAddress by PayoutAccountsTable.lightningAddress
    var isDeleted by PayoutAccountsTable.isDeleted
    var createdAt by PayoutAccountsTable.createdAt
}
