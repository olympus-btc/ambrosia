package pos.ambrosia.utest

import io.ktor.server.engine.applicationEnvironment
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.InvoiceEntity
import pos.ambrosia.db.tables.InvoicePaymentsTable
import pos.ambrosia.db.tables.InvoicesTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodEntity
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.TimeEntriesTable
import pos.ambrosia.db.tables.TimeEntryEntity
import pos.ambrosia.models.CreateFreelanceInvoiceRequest
import pos.ambrosia.models.FreelanceInvoicePayoutSnapshot
import pos.ambrosia.models.PayFreelanceInvoiceRequest
import pos.ambrosia.services.FreelanceInvoiceService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.FakeLightningBackend
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.testJwtConfig
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FreelanceInvoiceServiceTest {
    private lateinit var databaseFile: File
    private val environment = applicationEnvironment { config = testJwtConfig() }
    private val fakeLightningBackend = FakeLightningBackend("freelance-payment-hash", incomingPaymentReceivedSat = 25_000)
    private val freelanceInvoiceService = FreelanceInvoiceService(environment, fakeLightningBackend, WalletRateService())

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `previews draft invoice without creating records or locking time entries`() {
        val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
        val firstTimeEntryId =
            ExposedTestDb.seedTimeEntry(
                freelanceInvoiceFixture.projectId,
                freelanceInvoiceFixture.developmentTaskId,
                entryDate = "2026-08-19",
                durationMinutes = 60,
            )
        val secondTimeEntryId =
            ExposedTestDb.seedTimeEntry(
                freelanceInvoiceFixture.projectId,
                freelanceInvoiceFixture.designTaskId,
                entryDate = "2026-08-20",
                durationMinutes = 30,
            )

        val freelanceInvoicePreview =
            freelanceInvoiceService.previewDraftInvoice(
                CreateFreelanceInvoiceRequest(
                    clientId = freelanceInvoiceFixture.clientId,
                    periodStart = "2026-08-17",
                    periodEnd = "2026-08-23",
                ),
            )

        assertEquals("USD", freelanceInvoicePreview.currencyAcronym)
        assertEquals(15_000, freelanceInvoicePreview.totalCents)
        assertEquals("bank", freelanceInvoicePreview.paymentMethod)
        assertEquals(2, freelanceInvoicePreview.lineItems.size)
        assertEquals(setOf(10_000, 5_000), freelanceInvoicePreview.lineItems.map { previewLineItem -> previewLineItem.amountCents }.toSet())
        assertFalse(timeEntryIsLocked(firstTimeEntryId))
        assertFalse(timeEntryIsLocked(secondTimeEntryId))
        assertEquals(0, invoiceCount())
    }

    @Test
    fun `creates draft invoice from uninvoiced billable time entries`() {
        val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
        val firstTimeEntryId =
            ExposedTestDb.seedTimeEntry(
                freelanceInvoiceFixture.projectId,
                freelanceInvoiceFixture.developmentTaskId,
                entryDate = "2026-08-19",
                durationMinutes = 60,
            )
        val secondTimeEntryId =
            ExposedTestDb.seedTimeEntry(
                freelanceInvoiceFixture.projectId,
                freelanceInvoiceFixture.designTaskId,
                entryDate = "2026-08-20",
                durationMinutes = 30,
            )

        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = freelanceInvoiceFixture.clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                    ),
                )
            }

        assertEquals("draft", createdFreelanceInvoice.status)
        assertEquals("USD", createdFreelanceInvoice.currencyAcronym)
        assertEquals(15_000, createdFreelanceInvoice.totalCents)
        assertEquals("bank", createdFreelanceInvoice.paymentMethod)
        assertNull(createdFreelanceInvoice.paymentHash)
        assertNull(createdFreelanceInvoice.bolt11)
        assertEquals(2, createdFreelanceInvoice.lineItems.size)
        assertEquals(setOf(10_000, 5_000), createdFreelanceInvoice.lineItems.map { invoiceLineItem -> invoiceLineItem.amountCents }.toSet())
        assertTrue(timeEntryIsLocked(firstTimeEntryId, createdFreelanceInvoice.id))
        assertTrue(timeEntryIsLocked(secondTimeEntryId, createdFreelanceInvoice.id))
    }

    @Test
    fun `freezes the selected bank payout account in the draft invoice`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = currencyId)
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, payoutAccountId = payoutAccountId)
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 8_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)

        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                    ),
                )
            }

        val rawPayoutSnapshot =
            transaction {
                InvoiceEntity.findById(UUID.fromString(createdFreelanceInvoice.id))?.payoutSnapshot
            }
        assertNotNull(rawPayoutSnapshot)
        assertTrue(rawPayoutSnapshot.contains(":"))
        assertFailsWith<SerializationException> { Json.decodeFromString<FreelanceInvoicePayoutSnapshot>(rawPayoutSnapshot) }

        val payoutSnapshot =
            Json.decodeFromString<FreelanceInvoicePayoutSnapshot>(assertNotNull(createdFreelanceInvoice.payoutSnapshot))
        assertEquals(payoutAccountId, payoutSnapshot.id)
        assertEquals("bank", payoutSnapshot.type)
        assertEquals(currencyId, payoutSnapshot.currencyId)
    }

    @Test
    fun `ignores entries outside the invoice scope`() {
        val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.projectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-19",
            durationMinutes = 60,
        )
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.projectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-30",
            durationMinutes = 60,
        )
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.nonBillableProjectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-19",
            durationMinutes = 60,
            isBillable = false,
        )
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.otherProjectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-19",
            durationMinutes = 60,
        )

        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = freelanceInvoiceFixture.clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                    ),
                )
            }

        assertEquals(10_000, createdFreelanceInvoice.totalCents)
        assertEquals(1, createdFreelanceInvoice.lineItems.size)
    }

    @Test
    fun `does not invoice the same time entries twice`() {
        val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.projectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-19",
            durationMinutes = 60,
        )

        runBlocking {
            freelanceInvoiceService.createDraftInvoice(
                CreateFreelanceInvoiceRequest(
                    clientId = freelanceInvoiceFixture.clientId,
                    periodStart = "2026-08-17",
                    periodEnd = "2026-08-23",
                ),
            )
        }

        assertFailsWith<InvalidTimeEntryException> {
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = freelanceInvoiceFixture.clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                    ),
                )
            }
        }
    }

    @Test
    fun `creates lightning draft invoice and stores rate metadata`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, paymentMethod = "lightning")
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 10_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)

        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                        exchangeRate = 50_000.0,
                        exchangeRateCurrency = "USD",
                    ),
                )
            }
        val walletRateByPaymentHash = WalletRateService().getRatesByPaymentHashes(listOf("freelance-payment-hash"))

        assertEquals("lightning", createdFreelanceInvoice.paymentMethod)
        assertEquals("freelance-payment-hash", createdFreelanceInvoice.paymentHash)
        assertEquals("freelance-payment-hash", createdFreelanceInvoice.bolt11)
        assertEquals(50_000, walletRateByPaymentHash.getValue("freelance-payment-hash").exchangeRateAtPayment.toInt())
        assertEquals("USD", walletRateByPaymentHash.getValue("freelance-payment-hash").exchangeRateCurrency)
    }

    @Test
    fun `registers bank invoice payment as partial then paid`() {
        ExposedTestDb.seedPaymentMethod("Bank Transfer")
        val freelanceInvoiceFixture = createFreelanceInvoiceFixture()
        ExposedTestDb.seedTimeEntry(
            freelanceInvoiceFixture.projectId,
            freelanceInvoiceFixture.developmentTaskId,
            entryDate = "2026-08-19",
            durationMinutes = 60,
        )
        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = freelanceInvoiceFixture.clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                    ),
                )
            }

        val partialFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.payFreelanceInvoice(
                    createdFreelanceInvoice.id,
                    PayFreelanceInvoiceRequest(amountCents = 5_000, transactionId = "bank-transfer-1"),
                )
            }
        val paidFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.payFreelanceInvoice(
                    createdFreelanceInvoice.id,
                    PayFreelanceInvoiceRequest(amountCents = 5_000, transactionId = "bank-transfer-2"),
                )
            }

        assertEquals("partial", partialFreelanceInvoice.status)
        assertEquals("paid", paidFreelanceInvoice.status)
        assertEquals(listOf("Bank Transfer", "Bank Transfer"), paymentMethodNamesForInvoice(createdFreelanceInvoice.id))
    }

    @Test
    fun `registers paid lightning invoice payment`() {
        ExposedTestDb.seedPaymentMethod("BTC")
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, paymentMethod = "lightning")
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 10_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)
        val createdFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                        exchangeRate = 50_000.0,
                        exchangeRateCurrency = "USD",
                    ),
                )
            }

        val paidFreelanceInvoice =
            runBlocking {
                freelanceInvoiceService.payFreelanceInvoice(createdFreelanceInvoice.id, PayFreelanceInvoiceRequest())
            }

        assertEquals("paid", paidFreelanceInvoice.status)
        assertEquals(listOf("BTC"), paymentMethodNamesForInvoice(createdFreelanceInvoice.id))
    }

    @Test
    fun `rejects unpaid lightning invoice payment`() {
        val unpaidLightningBackend = FakeLightningBackend("unpaid-freelance-payment-hash", incomingPaymentIsPaid = false)
        val unpaidFreelanceInvoiceService = FreelanceInvoiceService(environment, unpaidLightningBackend, WalletRateService())
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, paymentMethod = "lightning")
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 10_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)
        val createdFreelanceInvoice =
            runBlocking {
                unpaidFreelanceInvoiceService.createDraftInvoice(
                    CreateFreelanceInvoiceRequest(
                        clientId = clientId,
                        periodStart = "2026-08-17",
                        periodEnd = "2026-08-23",
                        exchangeRate = 50_000.0,
                        exchangeRateCurrency = "USD",
                    ),
                )
            }

        assertFailsWith<InvalidTimeEntryException> {
            runBlocking {
                unpaidFreelanceInvoiceService.payFreelanceInvoice(createdFreelanceInvoice.id, PayFreelanceInvoiceRequest())
            }
        }
    }

    private fun createFreelanceInvoiceFixture(): FreelanceInvoiceFixture {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = currencyId)
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, payoutAccountId = payoutAccountId)
        val otherClientId = ExposedTestDb.seedFreelanceClient(name = "Other Client", currencyId = currencyId)
        val projectId = ExposedTestDb.seedFreelanceProject(clientId = clientId, hourlyRateCents = 10_000)
        val nonBillableProjectId =
            ExposedTestDb.seedFreelanceProject(clientId = clientId, name = "Internal", isBillable = false)
        val otherProjectId = ExposedTestDb.seedFreelanceProject(clientId = otherClientId, name = "Other")
        return FreelanceInvoiceFixture(
            clientId = clientId,
            projectId = projectId,
            nonBillableProjectId = nonBillableProjectId,
            otherProjectId = otherProjectId,
            developmentTaskId = ExposedTestDb.seedTask("Development"),
            designTaskId = ExposedTestDb.seedTask("Design"),
        )
    }

    private fun timeEntryIsLocked(
        timeEntryId: String,
        invoiceId: String,
    ): Boolean =
        transaction {
            val timeEntry =
                TimeEntryEntity
                    .find {
                        TimeEntriesTable.id eq EntityID(UUID.fromString(timeEntryId), TimeEntriesTable)
                    }.single()
            timeEntry.isLocked && timeEntry.invoiceId?.value?.toString() == invoiceId
        }

    private fun timeEntryIsLocked(timeEntryId: String): Boolean =
        transaction {
            val timeEntry =
                TimeEntryEntity
                    .find {
                        TimeEntriesTable.id eq EntityID(UUID.fromString(timeEntryId), TimeEntriesTable)
                    }.single()
            timeEntry.isLocked || timeEntry.invoiceId != null
        }

    private fun invoiceCount(): Long =
        transaction {
            InvoiceEntity.all().count()
        }

    private fun paymentMethodNamesForInvoice(invoiceId: String): List<String> =
        transaction {
            val freelancePaymentIds =
                InvoicePaymentsTable
                    .selectAll()
                    .where {
                        InvoicePaymentsTable.invoiceId eq EntityID(UUID.fromString(invoiceId), InvoicesTable)
                    }.map { invoicePaymentRow -> invoicePaymentRow[InvoicePaymentsTable.paymentId] }

            PaymentEntity
                .find { PaymentsTable.id inList freelancePaymentIds }
                .map { freelancePayment ->
                    PaymentMethodEntity.findById(freelancePayment.methodId)!!.name
                }
        }

    private data class FreelanceInvoiceFixture(
        val clientId: String,
        val projectId: String,
        val nonBillableProjectId: String,
        val otherProjectId: String,
        val developmentTaskId: String,
        val designTaskId: String,
    )
}
