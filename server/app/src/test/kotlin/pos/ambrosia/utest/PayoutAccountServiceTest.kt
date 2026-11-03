package pos.ambrosia.utest

import io.ktor.server.engine.applicationEnvironment
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.PayoutAccountEntity
import pos.ambrosia.models.PayoutAccountUpsert
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.PayoutAccountService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.FakeLightningBackend
import pos.ambrosia.utils.LightningBackendUnavailableException
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

class PayoutAccountServiceTest {
    private lateinit var databaseFile: File
    private val environment = applicationEnvironment { config = testJwtConfig() }
    private val payoutAccountService = PayoutAccountService(environment)

    private val validBankRequest =
        PayoutAccountUpsert(
            type = "bank",
            accountHolder = "Jane Doe",
            bankName = "Acme Bank",
            accountNumber = "1234567890",
            currencyId = null,
        )

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        ActiveLightningBackend.closeActive()
    }

    @After
    fun tearDown() {
        ActiveLightningBackend.closeActive()
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `addPayoutAccount returns id for valid bank request`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")

        val payoutAccountId = payoutAccountService.addPayoutAccount(validBankRequest.copy(currencyId = currencyId))

        assertNotNull(payoutAccountId)
        val payoutAccount = payoutAccountService.getPayoutAccountById(payoutAccountId)
        assertNotNull(payoutAccount)
        assertEquals("bank", payoutAccount.type)
        assertEquals("Jane Doe", payoutAccount.accountHolder)
        assertEquals(currencyId, payoutAccount.currencyId)
    }

    @Test
    fun `addPayoutAccount rejects bank request missing required fields`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val validRequest = validBankRequest.copy(currencyId = currencyId)

        assertNull(payoutAccountService.addPayoutAccount(validRequest.copy(accountHolder = "  ")))
        assertNull(payoutAccountService.addPayoutAccount(validRequest.copy(bankName = "  ")))
        assertNull(payoutAccountService.addPayoutAccount(validRequest.copy(currencyId = null)))
        assertNull(payoutAccountService.addPayoutAccount(validRequest.copy(currencyId = UUID.randomUUID().toString())))
        assertNull(
            payoutAccountService.addPayoutAccount(
                validRequest.copy(accountNumber = null, iban = null, clabe = null),
            ),
        )
        assertNull(payoutAccountService.addPayoutAccount(validRequest.copy(lightningAddress = "user@getalby.com")))
    }

    @Test
    fun `addPayoutAccount accepts bank request identified by iban or clabe`() {
        val currencyId = ExposedTestDb.seedCurrency("EUR")
        val ibanRequest =
            validBankRequest.copy(currencyId = currencyId, accountNumber = null, iban = "DE89370400440532013000")
        val clabeRequest =
            validBankRequest.copy(currencyId = currencyId, accountNumber = null, clabe = "032180000118359719")

        assertNotNull(payoutAccountService.addPayoutAccount(ibanRequest))
        assertNotNull(payoutAccountService.addPayoutAccount(clabeRequest))
    }

    @Test
    fun `addPayoutAccount returns id for lightning request with lightning address`() {
        val payoutAccountId =
            payoutAccountService.addPayoutAccount(
                PayoutAccountUpsert(type = "lightning", lightningAddress = "freelancer@getalby.com"),
            )

        assertNotNull(payoutAccountId)
        val payoutAccount = payoutAccountService.getPayoutAccountById(payoutAccountId)
        assertNotNull(payoutAccount)
        assertEquals("lightning", payoutAccount.type)
        assertEquals("freelancer@getalby.com", payoutAccount.lightningAddress)
    }

    @Test
    fun `addPayoutAccount rejects blank lightning address without a local node fallback`() {
        assertFailsWith<LightningBackendUnavailableException> {
            payoutAccountService.addPayoutAccount(PayoutAccountUpsert(type = "lightning", lightningAddress = null))
        }
    }

    @Test
    fun `updatePayoutAccount rejects blank lightning address without a local node fallback`() {
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = ExposedTestDb.seedCurrency("USD"))

        assertFailsWith<LightningBackendUnavailableException> {
            payoutAccountService.updatePayoutAccount(payoutAccountId, PayoutAccountUpsert(type = "lightning", lightningAddress = " "))
        }
    }

    @Test
    fun `updatePayoutAccount returns false for a missing account before checking the lightning backend`() {
        val nodeLightningRequest = PayoutAccountUpsert(type = "lightning", lightningAddress = null)

        assertFalse(payoutAccountService.updatePayoutAccount(UUID.randomUUID().toString(), nodeLightningRequest))
    }

    @Test
    fun `addPayoutAccount rejects lightning request mixing bank fields before checking the lightning backend`() {
        val mixedLightningRequest = PayoutAccountUpsert(type = "lightning", bankName = "Acme Bank", lightningAddress = null)

        assertNull(payoutAccountService.addPayoutAccount(mixedLightningRequest))
    }

    @Test
    fun `addPayoutAccount accepts blank lightning address when a local node is available`() {
        ActiveLightningBackend.set(FakeLightningBackend("phoenixd"))

        val payoutAccountId =
            payoutAccountService.addPayoutAccount(PayoutAccountUpsert(type = "lightning", lightningAddress = null))

        assertNotNull(payoutAccountId)
    }

    @Test
    fun `addPayoutAccount rejects lightning request mixing bank fields`() {
        val payoutAccountId =
            payoutAccountService.addPayoutAccount(
                PayoutAccountUpsert(
                    type = "lightning",
                    lightningAddress = "freelancer@getalby.com",
                    bankName = "Acme Bank",
                ),
            )

        assertNull(payoutAccountId)
    }

    @Test
    fun `addPayoutAccount rejects unknown type`() {
        assertNull(payoutAccountService.addPayoutAccount(validBankRequest.copy(type = "cash")))
    }

    @Test
    fun `getPayoutAccounts excludes deleted accounts`() {
        ExposedTestDb.seedPayoutAccount()
        ExposedTestDb.seedPayoutAccount(isDeleted = true)

        val payoutAccounts = payoutAccountService.getPayoutAccounts()

        assertEquals(1, payoutAccounts.size)
        assertFalse(payoutAccounts[0].isDeleted)
    }

    @Test
    fun `getPayoutAccountById returns null for invalid missing or deleted account`() {
        val deletedPayoutAccountId = ExposedTestDb.seedPayoutAccount(isDeleted = true)

        assertNull(payoutAccountService.getPayoutAccountById("not-a-uuid"))
        assertNull(payoutAccountService.getPayoutAccountById(UUID.randomUUID().toString()))
        assertNull(payoutAccountService.getPayoutAccountById(deletedPayoutAccountId))
    }

    @Test
    fun `updatePayoutAccount updates active account`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val payoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = currencyId)

        val payoutAccountWasUpdated =
            payoutAccountService.updatePayoutAccount(
                payoutAccountId,
                validBankRequest.copy(currencyId = currencyId, accountHolder = "Updated Holder"),
            )

        assertTrue(payoutAccountWasUpdated)
        val payoutAccount = payoutAccountService.getPayoutAccountById(payoutAccountId)
        assertNotNull(payoutAccount)
        assertEquals("Updated Holder", payoutAccount.accountHolder)
    }

    @Test
    fun `updatePayoutAccount returns false for invalid missing or deleted account`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val deletedPayoutAccountId = ExposedTestDb.seedPayoutAccount(currencyId = currencyId, isDeleted = true)
        val validRequest = validBankRequest.copy(currencyId = currencyId)

        assertFalse(payoutAccountService.updatePayoutAccount("not-a-uuid", validRequest))
        assertFalse(payoutAccountService.updatePayoutAccount(UUID.randomUUID().toString(), validRequest))
        assertFalse(payoutAccountService.updatePayoutAccount(deletedPayoutAccountId, validRequest))
        assertFalse(payoutAccountService.updatePayoutAccount(deletedPayoutAccountId, validRequest.copy(accountHolder = " ")))
    }

    @Test
    fun `deletePayoutAccount soft deletes account`() {
        val payoutAccountId = ExposedTestDb.seedPayoutAccount()

        val payoutAccountWasDeleted = payoutAccountService.deletePayoutAccount(payoutAccountId)

        assertTrue(payoutAccountWasDeleted)
        assertNull(payoutAccountService.getPayoutAccountById(payoutAccountId))
    }

    @Test
    fun `deletePayoutAccount returns false for invalid missing or already deleted account`() {
        val deletedPayoutAccountId = ExposedTestDb.seedPayoutAccount(isDeleted = true)

        assertFalse(payoutAccountService.deletePayoutAccount("not-a-uuid"))
        assertFalse(payoutAccountService.deletePayoutAccount(UUID.randomUUID().toString()))
        assertFalse(payoutAccountService.deletePayoutAccount(deletedPayoutAccountId))
    }

    @Test
    fun `addPayoutAccount encrypts bank fields at rest and decrypts on read`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val maxLengthIban = "DE" + "0".repeat(32)
        val payoutAccountId =
            payoutAccountService.addPayoutAccount(
                validBankRequest.copy(currencyId = currencyId, accountNumber = null, iban = maxLengthIban),
            )
        assertNotNull(payoutAccountId)

        val rawAccountHolder =
            transaction {
                PayoutAccountEntity.findById(UUID.fromString(payoutAccountId))?.accountHolder
            }
        assertNotNull(rawAccountHolder)
        assertNotEquals("Jane Doe", rawAccountHolder)
        assertTrue(rawAccountHolder.contains(":"))

        val payoutAccount = payoutAccountService.getPayoutAccountById(payoutAccountId)
        assertNotNull(payoutAccount)
        assertEquals("Jane Doe", payoutAccount.accountHolder)
        assertEquals(maxLengthIban, payoutAccount.iban)
    }
}
