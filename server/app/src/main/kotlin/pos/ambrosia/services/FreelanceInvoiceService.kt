package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.core.lessEq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ClientEntity
import pos.ambrosia.db.tables.ClientsTable
import pos.ambrosia.db.tables.CurrencyEntity
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.InvoiceEntity
import pos.ambrosia.db.tables.InvoiceLineItemEntity
import pos.ambrosia.db.tables.InvoiceLineItemsTable
import pos.ambrosia.db.tables.InvoicePaymentsTable
import pos.ambrosia.db.tables.InvoicesTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.PayoutAccountEntity
import pos.ambrosia.db.tables.ProjectEntity
import pos.ambrosia.db.tables.ProjectsTable
import pos.ambrosia.db.tables.TaskEntity
import pos.ambrosia.db.tables.TasksTable
import pos.ambrosia.db.tables.TimeEntriesTable
import pos.ambrosia.db.tables.TimeEntryEntity
import pos.ambrosia.models.CreateFreelanceInvoiceRequest
import pos.ambrosia.models.FreelanceInvoiceLineItemResponse
import pos.ambrosia.models.FreelanceInvoicePayoutSnapshot
import pos.ambrosia.models.FreelanceInvoicePreviewLineItemResponse
import pos.ambrosia.models.FreelanceInvoicePreviewResponse
import pos.ambrosia.models.FreelanceInvoiceResponse
import pos.ambrosia.models.PayFreelanceInvoiceRequest
import pos.ambrosia.models.WalletInvoiceRate
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.SecretsCipher
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.UUID

class FreelanceInvoiceService(
    private val environment: ApplicationEnvironment,
    private val lightningBackend: LightningBackend = ActiveLightningBackend,
    private val walletRateService: WalletRateService = WalletRateService(),
) {
    private val fieldEncryptionKey by lazy { SecretsCipher.deriveFieldEncryptionKey(environment.config.property("secret").getString()) }

    fun previewDraftInvoice(createFreelanceInvoiceRequest: CreateFreelanceInvoiceRequest): FreelanceInvoicePreviewResponse {
        val preparedFreelanceInvoice = prepareDraftFreelanceInvoice(createFreelanceInvoiceRequest)
        return toFreelanceInvoicePreviewResponse(preparedFreelanceInvoice)
    }

    suspend fun createDraftInvoice(createFreelanceInvoiceRequest: CreateFreelanceInvoiceRequest): FreelanceInvoiceResponse {
        val preparedFreelanceInvoice = prepareDraftFreelanceInvoice(createFreelanceInvoiceRequest)
        val lightningInvoiceData = createLightningInvoiceIfNeeded(preparedFreelanceInvoice, createFreelanceInvoiceRequest)
        val createdFreelanceInvoice = persistDraftFreelanceInvoice(preparedFreelanceInvoice, lightningInvoiceData)
        lightningInvoiceData?.let { createdLightningInvoiceData ->
            walletRateService.saveInvoiceRate(
                WalletInvoiceRate(
                    paymentHash = createdLightningInvoiceData.paymentHash,
                    satoshiAmount = createdLightningInvoiceData.satoshiAmount,
                    exchangeRate = createdLightningInvoiceData.exchangeRate,
                    exchangeRateCurrency = createdLightningInvoiceData.exchangeRateCurrency,
                    fiatAmount = createdLightningInvoiceData.fiatAmount,
                ),
            )
        }
        return createdFreelanceInvoice
    }

    suspend fun payFreelanceInvoice(
        freelanceInvoiceId: String,
        payFreelanceInvoiceRequest: PayFreelanceInvoiceRequest,
    ): FreelanceInvoiceResponse {
        val preparedFreelanceInvoicePayment = prepareFreelanceInvoicePayment(freelanceInvoiceId)
        val verifiedFreelanceInvoicePayment =
            when (preparedFreelanceInvoicePayment.paymentMethod) {
                "lightning" -> verifyLightningFreelanceInvoicePayment(preparedFreelanceInvoicePayment)
                "bank" -> verifyBankFreelanceInvoicePayment(payFreelanceInvoiceRequest)
                else -> throw InvalidTimeEntryException("Unsupported invoice payment method")
            }

        return persistFreelanceInvoicePayment(preparedFreelanceInvoicePayment, verifiedFreelanceInvoicePayment)
    }

    private fun prepareDraftFreelanceInvoice(createFreelanceInvoiceRequest: CreateFreelanceInvoiceRequest): PreparedFreelanceInvoice =
        transaction {
            val periodStartDate = parseDate(createFreelanceInvoiceRequest.periodStart, "periodStart")
            val periodEndDate = parseDate(createFreelanceInvoiceRequest.periodEnd, "periodEnd")
            if (periodStartDate > periodEndDate) {
                throw InvalidTimeEntryException("periodStart must be before or equal to periodEnd")
            }

            val requestedClient =
                ClientEntity
                    .findById(parseUuid(createFreelanceInvoiceRequest.clientId, "clientId"))
                    ?.takeIf { client -> !client.isDeleted }
                    ?: throw ResourceNotFoundException("Client not found")
            val clientProjects =
                ProjectEntity
                    .find {
                        (ProjectsTable.clientId eq requestedClient.id) and
                            (ProjectsTable.isDeleted eq false)
                    }.toList()
            if (clientProjects.isEmpty()) throw InvalidTimeEntryException("No projects found for this client")

            val uninvoicedTimeEntries =
                TimeEntryEntity
                    .find {
                        (TimeEntriesTable.projectId inList clientProjects.map { project -> project.id }) and
                            (TimeEntriesTable.entryDate greaterEq periodStartDate.toString()) and
                            (TimeEntriesTable.entryDate lessEq periodEndDate.toString()) and
                            (TimeEntriesTable.isBillable eq true) and
                            TimeEntriesTable.invoiceId.isNull()
                    }.orderBy(
                        TimeEntriesTable.entryDate to SortOrder.ASC,
                        TimeEntriesTable.createdAt to SortOrder.ASC,
                    ).toList()
            if (uninvoicedTimeEntries.isEmpty()) {
                throw InvalidTimeEntryException("No uninvoiced billable time entries found for this period")
            }

            val projectReferences = clientProjects.associateBy { project -> project.id }
            val preparedLineItems =
                uninvoicedTimeEntries
                    .groupBy { timeEntry ->
                        val project = projectReferences.getValue(timeEntry.projectId)
                        FreelanceInvoiceLineItemKey(
                            projectId = timeEntry.projectId,
                            taskId = timeEntry.taskId,
                            rateCents = project.hourlyRateCents ?: requestedClient.hourlyRateCents,
                        )
                    }.map { (freelanceInvoiceLineItemKey, timeEntriesForLineItem) ->
                        val project = projectReferences.getValue(freelanceInvoiceLineItemKey.projectId)
                        val task =
                            TaskEntity.findById(freelanceInvoiceLineItemKey.taskId)
                                ?: throw ResourceNotFoundException("Task not found")
                        PreparedFreelanceInvoiceLineItem(
                            projectId = freelanceInvoiceLineItemKey.projectId.value,
                            projectName = project.name,
                            taskId = freelanceInvoiceLineItemKey.taskId.value,
                            taskName = task.name,
                            quantityMinutes = timeEntriesForLineItem.sumOf { timeEntry -> timeEntry.durationMinutes },
                            rateCents = freelanceInvoiceLineItemKey.rateCents,
                            amountCents =
                                timeEntriesForLineItem.sumOf { timeEntry ->
                                    calculateAmountCents(freelanceInvoiceLineItemKey.rateCents, timeEntry.durationMinutes)
                                },
                        )
                    }.sortedWith(
                        compareBy<PreparedFreelanceInvoiceLineItem> { preparedLineItem ->
                            preparedLineItem.projectName
                        }.thenBy { preparedLineItem ->
                            preparedLineItem.taskName
                        },
                    )
            PreparedFreelanceInvoice(
                invoiceYear = periodStartDate.year,
                clientId = requestedClient.id.value,
                currencyId = requestedClient.currencyId.value,
                periodStart = periodStartDate.toString(),
                periodEnd = periodEndDate.toString(),
                totalCents = preparedLineItems.sumOf { preparedLineItem -> preparedLineItem.amountCents },
                payoutSnapshot = buildPayoutSnapshot(requestedClient, createFreelanceInvoiceRequest.payoutAccountId),
                paymentMethod = requestedClient.paymentMethod,
                lineItems = preparedLineItems,
                timeEntryIds = uninvoicedTimeEntries.map { timeEntry -> timeEntry.id.value },
            )
        }

    private suspend fun createLightningInvoiceIfNeeded(
        preparedFreelanceInvoice: PreparedFreelanceInvoice,
        createFreelanceInvoiceRequest: CreateFreelanceInvoiceRequest,
    ): LightningFreelanceInvoiceData? {
        if (preparedFreelanceInvoice.paymentMethod != "lightning") return null

        val exchangeRate =
            createFreelanceInvoiceRequest.exchangeRate
                ?.takeIf { requestedExchangeRate -> requestedExchangeRate > 0 }
                ?: throw InvalidTimeEntryException("A positive exchangeRate is required for Lightning invoices")
        val exchangeRateCurrency =
            createFreelanceInvoiceRequest.exchangeRateCurrency
                ?.takeIf { requestedExchangeRateCurrency -> requestedExchangeRateCurrency.isNotBlank() }
                ?: throw InvalidTimeEntryException("exchangeRateCurrency is required for Lightning invoices")
        val fiatAmount = preparedFreelanceInvoice.totalCents.toDouble() / 100
        val satoshiAmount = calculateSatoshiAmount(preparedFreelanceInvoice.totalCents, exchangeRate)
        val createdLightningInvoice =
            lightningBackend.createInvoice(
                CreateInvoiceRequest(
                    description = "Freelance invoice ${preparedFreelanceInvoice.periodStart} to ${preparedFreelanceInvoice.periodEnd}",
                    amountSat = satoshiAmount,
                    exchangeRate = exchangeRate,
                    exchangeRateCurrency = exchangeRateCurrency,
                    fiatAmount = fiatAmount,
                ),
            )

        return LightningFreelanceInvoiceData(
            paymentHash = createdLightningInvoice.paymentHash,
            bolt11 = createdLightningInvoice.serialized,
            satoshiAmount = satoshiAmount,
            exchangeRate = exchangeRate,
            exchangeRateCurrency = exchangeRateCurrency,
            fiatAmount = fiatAmount,
        )
    }

    private fun persistDraftFreelanceInvoice(
        preparedFreelanceInvoice: PreparedFreelanceInvoice,
        lightningFreelanceInvoiceData: LightningFreelanceInvoiceData?,
    ): FreelanceInvoiceResponse =
        transaction {
            val currentTimestamp = LocalDateTime.now().toString()
            val draftFreelanceInvoice =
                InvoiceEntity.new(UUID.randomUUID()) {
                    invoiceYear = preparedFreelanceInvoice.invoiceYear
                    invoiceNumber = nextInvoiceNumber(preparedFreelanceInvoice.invoiceYear)
                    clientId = EntityID(preparedFreelanceInvoice.clientId, ClientsTable)
                    status = "draft"
                    currencyId = EntityID(preparedFreelanceInvoice.currencyId, CurrencyTable)
                    periodStart = preparedFreelanceInvoice.periodStart
                    periodEnd = preparedFreelanceInvoice.periodEnd
                    totalCents = preparedFreelanceInvoice.totalCents
                    payoutSnapshot = preparedFreelanceInvoice.payoutSnapshot
                    paymentMethod = preparedFreelanceInvoice.paymentMethod
                    paymentHash = lightningFreelanceInvoiceData?.paymentHash
                    bolt11 = lightningFreelanceInvoiceData?.bolt11
                    createdAt = currentTimestamp
                }

            val freelanceInvoiceLineItems =
                createInvoiceLineItems(
                    draftInvoice = draftFreelanceInvoice,
                    preparedLineItems = preparedFreelanceInvoice.lineItems,
                    createdAt = currentTimestamp,
                )
            val timeEntriesToLock =
                TimeEntryEntity
                    .find {
                        TimeEntriesTable.id inList
                            preparedFreelanceInvoice.timeEntryIds.map { timeEntryId ->
                                EntityID(timeEntryId, TimeEntriesTable)
                            }
                    }.toList()
            val hasAlreadyInvoicedTimeEntry =
                timeEntriesToLock.any { timeEntry -> timeEntry.invoiceId != null }
            if (timeEntriesToLock.size != preparedFreelanceInvoice.timeEntryIds.size || hasAlreadyInvoicedTimeEntry) {
                throw InvalidTimeEntryException("One or more time entries have already been invoiced")
            }
            timeEntriesToLock.forEach { timeEntry ->
                timeEntry.invoiceId = draftFreelanceInvoice.id
                timeEntry.isLocked = true
            }

            toFreelanceInvoiceResponse(draftFreelanceInvoice, freelanceInvoiceLineItems)
        }

    fun getFreelanceInvoices(): List<FreelanceInvoiceResponse> =
        transaction {
            InvoiceEntity
                .all()
                .orderBy(InvoicesTable.createdAt to SortOrder.DESC)
                .map { freelanceInvoice -> toFreelanceInvoiceResponse(freelanceInvoice) }
        }

    fun getFreelanceInvoiceById(freelanceInvoiceId: String): FreelanceInvoiceResponse? =
        transaction {
            InvoiceEntity
                .findById(parseUuid(freelanceInvoiceId, "freelanceInvoiceId"))
                ?.let { freelanceInvoice -> toFreelanceInvoiceResponse(freelanceInvoice) }
        }

    private fun toFreelanceInvoicePreviewResponse(preparedFreelanceInvoice: PreparedFreelanceInvoice): FreelanceInvoicePreviewResponse =
        transaction {
            val client =
                ClientEntity.findById(preparedFreelanceInvoice.clientId)
                    ?: throw ResourceNotFoundException("Client not found")
            val currency =
                CurrencyEntity.findById(preparedFreelanceInvoice.currencyId)
                    ?: throw ResourceNotFoundException("Currency not found")

            FreelanceInvoicePreviewResponse(
                clientId = client.id.value.toString(),
                clientName = client.name,
                currencyId = currency.id.value.toString(),
                currencyAcronym = currency.acronym,
                periodStart = preparedFreelanceInvoice.periodStart,
                periodEnd = preparedFreelanceInvoice.periodEnd,
                totalCents = preparedFreelanceInvoice.totalCents,
                payoutSnapshot = SecretsCipher.decryptOrNull(preparedFreelanceInvoice.payoutSnapshot, fieldEncryptionKey),
                paymentMethod = preparedFreelanceInvoice.paymentMethod,
                lineItems =
                    preparedFreelanceInvoice.lineItems.map { preparedLineItem ->
                        FreelanceInvoicePreviewLineItemResponse(
                            projectId = preparedLineItem.projectId.toString(),
                            projectName = preparedLineItem.projectName,
                            taskId = preparedLineItem.taskId.toString(),
                            taskName = preparedLineItem.taskName,
                            quantityMinutes = preparedLineItem.quantityMinutes,
                            rateCents = preparedLineItem.rateCents,
                            amountCents = preparedLineItem.amountCents,
                        )
                    },
            )
        }

    private fun createInvoiceLineItems(
        draftInvoice: InvoiceEntity,
        preparedLineItems: List<PreparedFreelanceInvoiceLineItem>,
        createdAt: String,
    ): List<InvoiceLineItemEntity> =
        preparedLineItems
            .map { preparedLineItem ->
                InvoiceLineItemEntity.new(UUID.randomUUID()) {
                    invoiceId = draftInvoice.id
                    projectId = EntityID(preparedLineItem.projectId, ProjectsTable)
                    taskId = EntityID(preparedLineItem.taskId, TasksTable)
                    quantityMinutes = preparedLineItem.quantityMinutes
                    rateCents = preparedLineItem.rateCents
                    amountCents = preparedLineItem.amountCents
                    this.createdAt = createdAt
                }
            }

    private fun buildPayoutSnapshot(
        client: ClientEntity,
        selectedPayoutAccountId: String?,
    ): String? {
        if (client.paymentMethod != "bank") return null
        val payoutAccountId = selectedPayoutAccountId ?: client.payoutAccountId?.value?.toString()
        val payoutAccount =
            payoutAccountId
                ?.let { payoutAccountIdValue -> parseUuid(payoutAccountIdValue, "payoutAccountId") }
                ?.let { payoutAccountUuid -> PayoutAccountEntity.findById(payoutAccountUuid) }
                ?.takeIf { payoutAccountEntity -> !payoutAccountEntity.isDeleted }
                ?: throw InvalidTimeEntryException("A valid bank payout account is required")
        if (payoutAccount.type != "bank") throw InvalidTimeEntryException("Payout account must be a bank account")

        val payoutSnapshotJson =
            Json.encodeToString(
                FreelanceInvoicePayoutSnapshot(
                    id = payoutAccount.id.value.toString(),
                    type = payoutAccount.type,
                    accountHolder = SecretsCipher.decryptOrNull(payoutAccount.accountHolder, fieldEncryptionKey),
                    bankName = SecretsCipher.decryptOrNull(payoutAccount.bankName, fieldEncryptionKey),
                    accountNumber = SecretsCipher.decryptOrNull(payoutAccount.accountNumber, fieldEncryptionKey),
                    currencyId = payoutAccount.currencyId?.value?.toString(),
                    swift = SecretsCipher.decryptOrNull(payoutAccount.swift, fieldEncryptionKey),
                    iban = SecretsCipher.decryptOrNull(payoutAccount.iban, fieldEncryptionKey),
                    clabe = SecretsCipher.decryptOrNull(payoutAccount.clabe, fieldEncryptionKey),
                    lightningAddress = SecretsCipher.decryptOrNull(payoutAccount.lightningAddress, fieldEncryptionKey),
                ),
            )

        return SecretsCipher.encrypt(payoutSnapshotJson, fieldEncryptionKey)
    }

    private fun prepareFreelanceInvoicePayment(freelanceInvoiceId: String): PreparedFreelanceInvoicePayment =
        transaction {
            val freelanceInvoice =
                InvoiceEntity.findById(parseUuid(freelanceInvoiceId, "freelanceInvoiceId"))
                    ?: throw ResourceNotFoundException("Freelance invoice not found")
            if (freelanceInvoice.status == "paid") {
                throw InvalidTimeEntryException("Freelance invoice is already paid")
            }

            PreparedFreelanceInvoicePayment(
                invoiceId = freelanceInvoice.id.value,
                currencyId = freelanceInvoice.currencyId.value,
                totalCents = freelanceInvoice.totalCents,
                paymentMethod = freelanceInvoice.paymentMethod,
                paymentHash = freelanceInvoice.paymentHash,
            )
        }

    private suspend fun verifyLightningFreelanceInvoicePayment(
        preparedFreelanceInvoicePayment: PreparedFreelanceInvoicePayment,
    ): VerifiedFreelanceInvoicePayment {
        val invoicePaymentHash =
            preparedFreelanceInvoicePayment.paymentHash
                ?: throw InvalidTimeEntryException("Freelance invoice does not have a Lightning payment hash")
        val incomingFreelancePayment = lightningBackend.getIncomingPayment(invoicePaymentHash)
        if (!incomingFreelancePayment.isPaid) {
            throw InvalidTimeEntryException("Freelance invoice has not been paid")
        }
        val walletRateByPaymentHash = walletRateService.getRatesByPaymentHashes(listOf(invoicePaymentHash))
        val walletRate = walletRateByPaymentHash[invoicePaymentHash]

        return VerifiedFreelanceInvoicePayment(
            paymentMethodName = "BTC",
            transactionId = incomingFreelancePayment.externalId ?: incomingFreelancePayment.paymentHash,
            amountCents = preparedFreelanceInvoicePayment.totalCents,
            satoshiAmount = incomingFreelancePayment.receivedSat,
            paymentHash = incomingFreelancePayment.paymentHash,
            exchangeRate = walletRate?.exchangeRateAtPayment,
            exchangeRateCurrency = walletRate?.exchangeRateCurrency,
            fiatAmount = walletRate?.fiatAmountAtPayment,
        )
    }

    private fun verifyBankFreelanceInvoicePayment(payFreelanceInvoiceRequest: PayFreelanceInvoiceRequest): VerifiedFreelanceInvoicePayment {
        val paidAmountCents =
            payFreelanceInvoiceRequest.amountCents
                ?.takeIf { requestedAmountCents -> requestedAmountCents > 0 }
                ?: throw InvalidTimeEntryException("A positive amountCents is required for bank invoice payments")

        return VerifiedFreelanceInvoicePayment(
            paymentMethodName = "Bank Transfer",
            transactionId = payFreelanceInvoiceRequest.transactionId.orEmpty(),
            amountCents = paidAmountCents,
        )
    }

    private fun persistFreelanceInvoicePayment(
        preparedFreelanceInvoicePayment: PreparedFreelanceInvoicePayment,
        verifiedFreelanceInvoicePayment: VerifiedFreelanceInvoicePayment,
    ): FreelanceInvoiceResponse =
        transaction {
            val freelanceInvoice =
                InvoiceEntity.findById(preparedFreelanceInvoicePayment.invoiceId)
                    ?: throw ResourceNotFoundException("Freelance invoice not found")
            if (freelanceInvoice.status == "paid") {
                throw InvalidTimeEntryException("Freelance invoice is already paid")
            }

            val freelancePayment =
                findExistingFreelancePayment(verifiedFreelanceInvoicePayment)
                    ?: createFreelancePayment(preparedFreelanceInvoicePayment, verifiedFreelanceInvoicePayment)
            linkFreelancePaymentToInvoice(freelancePayment, freelanceInvoice)
            updateFreelanceInvoicePaymentStatus(freelanceInvoice)

            toFreelanceInvoiceResponse(freelanceInvoice)
        }

    private fun findExistingFreelancePayment(verifiedFreelanceInvoicePayment: VerifiedFreelanceInvoicePayment): PaymentEntity? {
        val invoicePaymentHash = verifiedFreelanceInvoicePayment.paymentHash ?: return null
        val existingFreelancePayment =
            PaymentEntity
                .find { PaymentsTable.paymentHash eq invoicePaymentHash }
                .firstOrNull()
                ?: return null
        val existingInvoicePaymentLink =
            InvoicePaymentsTable
                .selectAll()
                .where { InvoicePaymentsTable.paymentId eq existingFreelancePayment.id }
                .firstOrNull()
        if (existingInvoicePaymentLink == null) {
            throw InvalidTimeEntryException("Lightning payment is already recorded outside freelance invoices")
        }
        return existingFreelancePayment
    }

    private fun createFreelancePayment(
        preparedFreelanceInvoicePayment: PreparedFreelanceInvoicePayment,
        verifiedFreelanceInvoicePayment: VerifiedFreelanceInvoicePayment,
    ): PaymentEntity =
        PaymentEntity.new(UUID.randomUUID()) {
            methodId = findPaymentMethodId(verifiedFreelanceInvoicePayment.paymentMethodName)
            currencyId = EntityID(preparedFreelanceInvoicePayment.currencyId, CurrencyTable)
            transactionId = verifiedFreelanceInvoicePayment.transactionId
            amount = verifiedFreelanceInvoicePayment.amountCents.toDouble() / 100
            date = LocalDateTime.now().toString()
            satoshiAmount = verifiedFreelanceInvoicePayment.satoshiAmount
            exchangeRateAtPayment = verifiedFreelanceInvoicePayment.exchangeRate
            paymentHash = verifiedFreelanceInvoicePayment.paymentHash
            exchangeRateCurrency = verifiedFreelanceInvoicePayment.exchangeRateCurrency
            fiatAmountAtPayment = verifiedFreelanceInvoicePayment.fiatAmount
        }

    private fun linkFreelancePaymentToInvoice(
        freelancePayment: PaymentEntity,
        freelanceInvoice: InvoiceEntity,
    ) {
        val linkAlreadyExists =
            InvoicePaymentsTable
                .selectAll()
                .where {
                    (InvoicePaymentsTable.paymentId eq freelancePayment.id) and
                        (InvoicePaymentsTable.invoiceId eq freelanceInvoice.id)
                }.any()
        if (linkAlreadyExists) return

        val paymentLinkedToAnotherInvoice =
            InvoicePaymentsTable
                .selectAll()
                .where { InvoicePaymentsTable.paymentId eq freelancePayment.id }
                .any()
        if (paymentLinkedToAnotherInvoice) {
            throw InvalidTimeEntryException("Payment is already linked to another freelance invoice")
        }

        InvoicePaymentsTable.insert { invoicePaymentRow ->
            invoicePaymentRow[paymentId] = freelancePayment.id
            invoicePaymentRow[invoiceId] = freelanceInvoice.id
        }
    }

    private fun updateFreelanceInvoicePaymentStatus(freelanceInvoice: InvoiceEntity) {
        val paidAmountCents = calculatePaidAmountCents(freelanceInvoice)
        freelanceInvoice.status =
            if (paidAmountCents >= freelanceInvoice.totalCents) {
                "paid"
            } else {
                "partial"
            }
    }

    private fun calculatePaidAmountCents(freelanceInvoice: InvoiceEntity): Int {
        val freelancePaymentIds =
            InvoicePaymentsTable
                .selectAll()
                .where { InvoicePaymentsTable.invoiceId eq freelanceInvoice.id }
                .map { invoicePaymentRow -> invoicePaymentRow[InvoicePaymentsTable.paymentId] }
        if (freelancePaymentIds.isEmpty()) return 0

        return PaymentEntity
            .find { PaymentsTable.id inList freelancePaymentIds }
            .sumOf { freelancePayment -> (freelancePayment.amount * 100).toInt() }
    }

    private fun findPaymentMethodId(paymentMethodName: String): EntityID<UUID> =
        PaymentMethodEntity
            .find { PaymentMethodsTable.name eq paymentMethodName }
            .firstOrNull()
            ?.id
            ?: throw ResourceNotFoundException("Payment method not found")

    private fun toFreelanceInvoiceResponse(
        invoice: InvoiceEntity,
        freelanceInvoiceLineItems: List<InvoiceLineItemEntity>? = null,
    ): FreelanceInvoiceResponse {
        val client =
            ClientEntity.findById(invoice.clientId)
                ?: throw ResourceNotFoundException("Client not found")
        val currency =
            CurrencyEntity.findById(invoice.currencyId)
                ?: throw ResourceNotFoundException("Currency not found")
        val resolvedInvoiceLineItems =
            freelanceInvoiceLineItems
                ?: InvoiceLineItemEntity
                    .find { InvoiceLineItemsTable.invoiceId eq invoice.id }
                    .toList()
        val invoiceLineItemProjectIds = resolvedInvoiceLineItems.map { invoiceLineItem -> invoiceLineItem.projectId }.distinct()
        val invoiceLineItemTaskIds = resolvedInvoiceLineItems.map { invoiceLineItem -> invoiceLineItem.taskId }.distinct()
        val projectReferences =
            if (resolvedInvoiceLineItems.isEmpty()) {
                emptyMap()
            } else {
                ProjectEntity
                    .find { ProjectsTable.id inList invoiceLineItemProjectIds }
                    .associateBy { project -> project.id }
            }
        val taskReferences =
            if (resolvedInvoiceLineItems.isEmpty()) {
                emptyMap()
            } else {
                TaskEntity
                    .find { TasksTable.id inList invoiceLineItemTaskIds }
                    .associateBy { task -> task.id }
            }

        return FreelanceInvoiceResponse(
            id = invoice.id.value.toString(),
            invoiceYear = invoice.invoiceYear,
            invoiceNumber = invoice.invoiceNumber,
            clientId = client.id.value.toString(),
            clientName = client.name,
            status = invoice.status,
            currencyId = currency.id.value.toString(),
            currencyAcronym = currency.acronym,
            periodStart = invoice.periodStart,
            periodEnd = invoice.periodEnd,
            totalCents = invoice.totalCents,
            payoutSnapshot = SecretsCipher.decryptOrNull(invoice.payoutSnapshot, fieldEncryptionKey),
            paymentMethod = invoice.paymentMethod,
            paymentHash = invoice.paymentHash,
            bolt11 = invoice.bolt11,
            createdAt = invoice.createdAt,
            lineItems =
                resolvedInvoiceLineItems.map { invoiceLineItem ->
                    val project = projectReferences.getValue(invoiceLineItem.projectId)
                    val task = taskReferences.getValue(invoiceLineItem.taskId)
                    FreelanceInvoiceLineItemResponse(
                        id = invoiceLineItem.id.value.toString(),
                        projectId = project.id.value.toString(),
                        projectName = project.name,
                        taskId = task.id.value.toString(),
                        taskName = task.name,
                        quantityMinutes = invoiceLineItem.quantityMinutes,
                        rateCents = invoiceLineItem.rateCents,
                        amountCents = invoiceLineItem.amountCents,
                        createdAt = invoiceLineItem.createdAt,
                    )
                },
        )
    }

    private fun nextInvoiceNumber(invoiceYear: Int): String {
        val invoiceCountForYear =
            InvoiceEntity
                .find { InvoicesTable.invoiceYear eq invoiceYear }
                .count()
        return "$invoiceYear-${(invoiceCountForYear + 1).toString().padStart(6, '0')}"
    }

    private data class FreelanceInvoiceLineItemKey(
        val projectId: EntityID<UUID>,
        val taskId: EntityID<UUID>,
        val rateCents: Int,
    )

    private data class PreparedFreelanceInvoice(
        val invoiceYear: Int,
        val clientId: UUID,
        val currencyId: UUID,
        val periodStart: String,
        val periodEnd: String,
        val totalCents: Int,
        val payoutSnapshot: String?,
        val paymentMethod: String,
        val lineItems: List<PreparedFreelanceInvoiceLineItem>,
        val timeEntryIds: List<UUID>,
    )

    private data class PreparedFreelanceInvoiceLineItem(
        val projectId: UUID,
        val projectName: String,
        val taskId: UUID,
        val taskName: String,
        val quantityMinutes: Int,
        val rateCents: Int,
        val amountCents: Int,
    )

    private data class LightningFreelanceInvoiceData(
        val paymentHash: String,
        val bolt11: String,
        val satoshiAmount: Long,
        val exchangeRate: Double,
        val exchangeRateCurrency: String,
        val fiatAmount: Double,
    )

    private data class PreparedFreelanceInvoicePayment(
        val invoiceId: UUID,
        val currencyId: UUID,
        val totalCents: Int,
        val paymentMethod: String,
        val paymentHash: String?,
    )

    private data class VerifiedFreelanceInvoicePayment(
        val paymentMethodName: String,
        val transactionId: String,
        val amountCents: Int,
        val satoshiAmount: Long? = null,
        val paymentHash: String? = null,
        val exchangeRate: Double? = null,
        val exchangeRateCurrency: String? = null,
        val fiatAmount: Double? = null,
    )

    companion object {
        private val isoDatePattern = Regex("\\d{4}-\\d{2}-\\d{2}")

        private fun parseUuid(
            rawValue: String,
            fieldName: String,
        ): UUID =
            try {
                UUID.fromString(rawValue)
            } catch (_: IllegalArgumentException) {
                throw InvalidTimeEntryException("$fieldName must be a valid UUID")
            }

        private fun parseDate(
            rawValue: String,
            fieldName: String,
        ): LocalDate {
            if (!isoDatePattern.matches(rawValue)) {
                throw InvalidTimeEntryException("$fieldName must use YYYY-MM-DD format")
            }
            return try {
                LocalDate.parse(rawValue, DateTimeFormatter.ISO_LOCAL_DATE)
            } catch (_: DateTimeParseException) {
                throw InvalidTimeEntryException("$fieldName must use YYYY-MM-DD format")
            }
        }

        private fun calculateAmountCents(
            rateCents: Int,
            durationMinutes: Int,
        ): Int =
            try {
                BigDecimal
                    .valueOf(rateCents.toLong())
                    .multiply(BigDecimal.valueOf(durationMinutes.toLong()))
                    .divide(BigDecimal.valueOf(60L), 0, RoundingMode.HALF_UP)
                    .intValueExact()
            } catch (_: ArithmeticException) {
                throw InvalidTimeEntryException("Calculated amount exceeds the supported range")
            }

        private fun calculateSatoshiAmount(
            totalCents: Int,
            exchangeRate: Double,
        ): Long =
            try {
                BigDecimal
                    .valueOf(totalCents.toLong())
                    .divide(BigDecimal.valueOf(100L), 8, RoundingMode.HALF_UP)
                    .divide(BigDecimal.valueOf(exchangeRate), 8, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100_000_000L))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValueExact()
                    .takeIf { satoshiAmount -> satoshiAmount > 0 }
                    ?: throw InvalidTimeEntryException("Lightning invoice amount must be greater than 0 sats")
            } catch (_: ArithmeticException) {
                throw InvalidTimeEntryException("Calculated Lightning invoice amount exceeds the supported range")
            }
    }
}
