package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ClientEntity
import pos.ambrosia.db.tables.ClientPaymentMethodsTable
import pos.ambrosia.db.tables.ClientsTable
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.logger
import pos.ambrosia.models.FreelanceClient
import pos.ambrosia.models.FreelanceClientUpsert
import java.time.LocalDateTime
import java.util.UUID

class ClientService {
    private val validBillingCycles = setOf("weekly", "biweekly", "monthly")
    private val validPaymentMethods = setOf("bank", "lightning")

    private fun parseUuid(value: String): UUID? =
        try {
            UUID.fromString(value)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun currencyExists(currencyId: String): Boolean {
        val currencyUuid = parseUuid(currencyId) ?: return false
        return !CurrencyTable
            .selectAll()
            .where { CurrencyTable.id eq EntityID(currencyUuid, CurrencyTable) }
            .empty()
    }

    private fun normalizedPaymentMethods(clientRequest: FreelanceClientUpsert): List<String> =
        clientRequest.paymentMethods
            .ifEmpty { clientRequest.paymentMethod?.let { paymentMethod -> listOf(paymentMethod) } ?: emptyList() }
            .map { paymentMethod -> paymentMethod.trim() }
            .filter { paymentMethod -> paymentMethod.isNotEmpty() }
            .distinct()

    private fun getClientPaymentMethods(clientId: UUID): List<String> =
        ClientPaymentMethodsTable
            .selectAll()
            .where { ClientPaymentMethodsTable.clientId eq EntityID(clientId, ClientsTable) }
            .orderBy(ClientPaymentMethodsTable.position to SortOrder.ASC)
            .map { clientPaymentMethodRow -> clientPaymentMethodRow[ClientPaymentMethodsTable.paymentMethod] }

    private fun replaceClientPaymentMethods(
        clientId: UUID,
        paymentMethods: List<String>,
    ) {
        ClientPaymentMethodsTable.deleteWhere { ClientPaymentMethodsTable.clientId eq EntityID(clientId, ClientsTable) }
        paymentMethods.forEachIndexed { paymentMethodIndex, paymentMethod ->
            ClientPaymentMethodsTable.insertIgnore { clientPaymentMethodInsert ->
                clientPaymentMethodInsert[ClientPaymentMethodsTable.clientId] = EntityID(clientId, ClientsTable)
                clientPaymentMethodInsert[ClientPaymentMethodsTable.paymentMethod] = paymentMethod
                clientPaymentMethodInsert[ClientPaymentMethodsTable.position] = paymentMethodIndex
            }
        }
    }

    private fun isValidClientRequest(clientRequest: FreelanceClientUpsert): Boolean =
        normalizedPaymentMethods(clientRequest).let { paymentMethods ->
            clientRequest.name.isNotBlank() &&
                clientRequest.hourlyRateCents >= 0 &&
                clientRequest.billingCycle in validBillingCycles &&
                paymentMethods.isNotEmpty() &&
                paymentMethods.all { paymentMethod -> paymentMethod in validPaymentMethods } &&
                currencyExists(clientRequest.currencyId)
        }

    private fun toClientModel(clientEntity: ClientEntity): FreelanceClient {
        val paymentMethods = getClientPaymentMethods(clientEntity.id.value).ifEmpty { listOf(clientEntity.paymentMethod) }
        return FreelanceClient(
            id = clientEntity.id.value.toString(),
            name = clientEntity.name,
            currencyId = clientEntity.currencyId.value.toString(),
            hourlyRateCents = clientEntity.hourlyRateCents,
            billingCycle = clientEntity.billingCycle,
            paymentMethod = paymentMethods.first(),
            paymentMethods = paymentMethods,
            payoutAccountId = clientEntity.payoutAccountId?.value?.toString(),
            isDeleted = clientEntity.isDeleted,
            createdAt = clientEntity.createdAt,
        )
    }

    fun getClients(): List<FreelanceClient> =
        transaction {
            ClientEntity
                .find { ClientsTable.isDeleted eq false }
                .map { clientEntity -> toClientModel(clientEntity) }
        }

    fun getClientById(clientId: String): FreelanceClient? =
        transaction {
            val clientUuid = parseUuid(clientId) ?: return@transaction null
            val clientEntity = ClientEntity.findById(clientUuid) ?: return@transaction null
            if (clientEntity.isDeleted) return@transaction null
            toClientModel(clientEntity)
        }

    fun addClient(clientRequest: FreelanceClientUpsert): String? =
        transaction {
            if (!isValidClientRequest(clientRequest)) return@transaction null
            val paymentMethods = normalizedPaymentMethods(clientRequest)

            val clientId =
                ClientEntity
                    .new(UUID.randomUUID()) {
                        name = clientRequest.name
                        currencyId = EntityID(UUID.fromString(clientRequest.currencyId), CurrencyTable)
                        hourlyRateCents = clientRequest.hourlyRateCents
                        billingCycle = clientRequest.billingCycle
                        paymentMethod = paymentMethods.first()
                        payoutAccountId = null
                        isDeleted = false
                        createdAt = LocalDateTime.now().toString()
                    }.id.value
            replaceClientPaymentMethods(clientId, paymentMethods)
            val clientIdValue = clientId.toString()
            logger.info("Freelance client created: $clientIdValue")
            clientIdValue
        }

    fun updateClient(
        clientId: String,
        clientRequest: FreelanceClientUpsert,
    ): Boolean =
        transaction {
            val clientUuid = parseUuid(clientId) ?: return@transaction false
            if (!isValidClientRequest(clientRequest)) return@transaction false
            val paymentMethods = normalizedPaymentMethods(clientRequest)

            val clientEntity = ClientEntity.findById(clientUuid) ?: return@transaction false
            if (clientEntity.isDeleted) return@transaction false

            clientEntity.name = clientRequest.name
            clientEntity.currencyId = EntityID(UUID.fromString(clientRequest.currencyId), CurrencyTable)
            clientEntity.hourlyRateCents = clientRequest.hourlyRateCents
            clientEntity.billingCycle = clientRequest.billingCycle
            clientEntity.paymentMethod = paymentMethods.first()
            clientEntity.payoutAccountId = null
            replaceClientPaymentMethods(clientUuid, paymentMethods)
            logger.info("Freelance client updated: $clientId")
            true
        }

    fun deleteClient(clientId: String): Boolean =
        transaction {
            val clientUuid = parseUuid(clientId) ?: return@transaction false
            val clientEntity = ClientEntity.findById(clientUuid) ?: return@transaction false
            if (clientEntity.isDeleted) return@transaction false

            clientEntity.isDeleted = true
            logger.info("Freelance client soft deleted: $clientId")
            true
        }
}
