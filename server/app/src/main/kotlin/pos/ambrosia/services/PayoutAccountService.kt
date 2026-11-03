package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.PayoutAccountEntity
import pos.ambrosia.db.tables.PayoutAccountsTable
import pos.ambrosia.logger
import pos.ambrosia.models.PayoutAccount
import pos.ambrosia.models.PayoutAccountUpsert
import pos.ambrosia.utils.LightningBackendUnavailableException
import pos.ambrosia.utils.SecretsCipher
import java.time.LocalDateTime
import java.util.UUID

class PayoutAccountService(
    private val environment: ApplicationEnvironment,
) {
    private val fieldEncryptionKey by lazy { SecretsCipher.deriveFieldEncryptionKey(environment.config.property("secret").getString()) }

    private fun parseUuid(rawUuid: String): UUID? =
        try {
            UUID.fromString(rawUuid)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun currencyExists(currencyId: String?): Boolean {
        if (currencyId.isNullOrBlank()) return true
        val currencyUuid = parseUuid(currencyId) ?: return false
        return !CurrencyTable
            .selectAll()
            .where { CurrencyTable.id eq EntityID(currencyUuid, CurrencyTable) }
            .empty()
    }

    private fun hasNoBankFields(payoutAccountRequest: PayoutAccountUpsert): Boolean =
        payoutAccountRequest.accountHolder.isNullOrBlank() &&
            payoutAccountRequest.bankName.isNullOrBlank() &&
            payoutAccountRequest.accountNumber.isNullOrBlank() &&
            payoutAccountRequest.swift.isNullOrBlank() &&
            payoutAccountRequest.iban.isNullOrBlank() &&
            payoutAccountRequest.clabe.isNullOrBlank()

    private fun isValidBankAccount(payoutAccountRequest: PayoutAccountUpsert): Boolean =
        !payoutAccountRequest.accountHolder.isNullOrBlank() &&
            !payoutAccountRequest.bankName.isNullOrBlank() &&
            !payoutAccountRequest.currencyId.isNullOrBlank() &&
            currencyExists(payoutAccountRequest.currencyId) &&
            (
                !payoutAccountRequest.accountNumber.isNullOrBlank() ||
                    !payoutAccountRequest.iban.isNullOrBlank() ||
                    !payoutAccountRequest.clabe.isNullOrBlank()
            ) &&
            payoutAccountRequest.lightningAddress.isNullOrBlank()

    private fun isValidLightningAccount(payoutAccountRequest: PayoutAccountUpsert): Boolean = hasNoBankFields(payoutAccountRequest)

    private fun requireLightningAddressOrActiveBackend(payoutAccountRequest: PayoutAccountUpsert) {
        val usesNodeLightningWallet =
            payoutAccountRequest.type == "lightning" && payoutAccountRequest.lightningAddress.isNullOrBlank()
        if (usesNodeLightningWallet && !ActiveLightningBackend.isAvailable()) {
            throw LightningBackendUnavailableException()
        }
    }

    private fun isValidPayoutAccountRequest(payoutAccountRequest: PayoutAccountUpsert): Boolean =
        when (payoutAccountRequest.type) {
            "bank" -> isValidBankAccount(payoutAccountRequest)
            "lightning" -> isValidLightningAccount(payoutAccountRequest)
            else -> false
        }

    private fun toPayoutAccountModel(payoutAccountEntity: PayoutAccountEntity): PayoutAccount =
        PayoutAccount(
            id = payoutAccountEntity.id.value.toString(),
            type = payoutAccountEntity.type,
            accountHolder = SecretsCipher.decryptOrNull(payoutAccountEntity.accountHolder, fieldEncryptionKey),
            bankName = SecretsCipher.decryptOrNull(payoutAccountEntity.bankName, fieldEncryptionKey),
            accountNumber = SecretsCipher.decryptOrNull(payoutAccountEntity.accountNumber, fieldEncryptionKey),
            currencyId = payoutAccountEntity.currencyId?.value?.toString(),
            swift = SecretsCipher.decryptOrNull(payoutAccountEntity.swift, fieldEncryptionKey),
            iban = SecretsCipher.decryptOrNull(payoutAccountEntity.iban, fieldEncryptionKey),
            clabe = SecretsCipher.decryptOrNull(payoutAccountEntity.clabe, fieldEncryptionKey),
            lightningAddress = SecretsCipher.decryptOrNull(payoutAccountEntity.lightningAddress, fieldEncryptionKey),
            isDeleted = payoutAccountEntity.isDeleted,
            createdAt = payoutAccountEntity.createdAt,
        )

    fun getPayoutAccounts(): List<PayoutAccount> =
        transaction {
            PayoutAccountEntity
                .find { PayoutAccountsTable.isDeleted eq false }
                .map { payoutAccountEntity -> toPayoutAccountModel(payoutAccountEntity) }
        }

    fun getPayoutAccountById(payoutAccountId: String): PayoutAccount? =
        transaction {
            val payoutAccountUuid = parseUuid(payoutAccountId) ?: return@transaction null
            val payoutAccountEntity = PayoutAccountEntity.findById(payoutAccountUuid) ?: return@transaction null
            if (payoutAccountEntity.isDeleted) return@transaction null
            toPayoutAccountModel(payoutAccountEntity)
        }

    fun addPayoutAccount(payoutAccountRequest: PayoutAccountUpsert): String? =
        transaction {
            if (!isValidPayoutAccountRequest(payoutAccountRequest)) return@transaction null
            requireLightningAddressOrActiveBackend(payoutAccountRequest)

            val payoutAccountId =
                PayoutAccountEntity
                    .new(UUID.randomUUID()) {
                        type = payoutAccountRequest.type
                        accountHolder = SecretsCipher.encryptOrNull(payoutAccountRequest.accountHolder, fieldEncryptionKey)
                        bankName = SecretsCipher.encryptOrNull(payoutAccountRequest.bankName, fieldEncryptionKey)
                        accountNumber = SecretsCipher.encryptOrNull(payoutAccountRequest.accountNumber, fieldEncryptionKey)
                        currencyId =
                            payoutAccountRequest.currencyId?.let { EntityID(UUID.fromString(it), CurrencyTable) }
                        swift = SecretsCipher.encryptOrNull(payoutAccountRequest.swift, fieldEncryptionKey)
                        iban = SecretsCipher.encryptOrNull(payoutAccountRequest.iban, fieldEncryptionKey)
                        clabe = SecretsCipher.encryptOrNull(payoutAccountRequest.clabe, fieldEncryptionKey)
                        lightningAddress = SecretsCipher.encryptOrNull(payoutAccountRequest.lightningAddress, fieldEncryptionKey)
                        isDeleted = false
                        createdAt = LocalDateTime.now().toString()
                    }.id.value
                    .toString()
            logger.info("Payout account created: $payoutAccountId")
            payoutAccountId
        }

    fun updatePayoutAccount(
        payoutAccountId: String,
        payoutAccountRequest: PayoutAccountUpsert,
    ): Boolean =
        transaction {
            val payoutAccountUuid = parseUuid(payoutAccountId) ?: return@transaction false
            if (!isValidPayoutAccountRequest(payoutAccountRequest)) return@transaction false

            val payoutAccountEntity = PayoutAccountEntity.findById(payoutAccountUuid) ?: return@transaction false
            if (payoutAccountEntity.isDeleted) return@transaction false
            requireLightningAddressOrActiveBackend(payoutAccountRequest)

            payoutAccountEntity.type = payoutAccountRequest.type
            payoutAccountEntity.accountHolder = SecretsCipher.encryptOrNull(payoutAccountRequest.accountHolder, fieldEncryptionKey)
            payoutAccountEntity.bankName = SecretsCipher.encryptOrNull(payoutAccountRequest.bankName, fieldEncryptionKey)
            payoutAccountEntity.accountNumber = SecretsCipher.encryptOrNull(payoutAccountRequest.accountNumber, fieldEncryptionKey)
            payoutAccountEntity.currencyId =
                payoutAccountRequest.currencyId?.let { EntityID(UUID.fromString(it), CurrencyTable) }
            payoutAccountEntity.swift = SecretsCipher.encryptOrNull(payoutAccountRequest.swift, fieldEncryptionKey)
            payoutAccountEntity.iban = SecretsCipher.encryptOrNull(payoutAccountRequest.iban, fieldEncryptionKey)
            payoutAccountEntity.clabe = SecretsCipher.encryptOrNull(payoutAccountRequest.clabe, fieldEncryptionKey)
            payoutAccountEntity.lightningAddress = SecretsCipher.encryptOrNull(payoutAccountRequest.lightningAddress, fieldEncryptionKey)
            logger.info("Payout account updated: $payoutAccountId")
            true
        }

    fun deletePayoutAccount(payoutAccountId: String): Boolean =
        transaction {
            val payoutAccountUuid = parseUuid(payoutAccountId) ?: return@transaction false
            val payoutAccountEntity = PayoutAccountEntity.findById(payoutAccountUuid) ?: return@transaction false
            if (payoutAccountEntity.isDeleted) return@transaction false

            payoutAccountEntity.isDeleted = true
            logger.info("Payout account soft deleted: $payoutAccountId")
            true
        }
}
