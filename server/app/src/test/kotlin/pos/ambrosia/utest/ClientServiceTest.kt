package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.models.FreelanceClientUpsert
import pos.ambrosia.services.ClientService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ClientServiceTest {
    private lateinit var databaseFile: File
    private val service = ClientService()

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `addClient returns id for valid request`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")

        val clientId =
            service.addClient(
                FreelanceClientUpsert(
                    name = "Acme",
                    currencyId = currencyId,
                    hourlyRateCents = 7500,
                    billingCycle = "monthly",
                    paymentMethods = listOf("bank", "lightning"),
                ),
            )

        assertNotNull(clientId)
        val client = service.getClientById(clientId)
        assertNotNull(client)
        assertEquals("Acme", client.name)
        assertEquals("bank", client.paymentMethod)
        assertEquals(listOf("bank", "lightning"), client.paymentMethods)
        assertNull(client.payoutAccountId)
    }

    @Test
    fun `addClient rejects invalid request values`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val validRequest =
            FreelanceClientUpsert(
                name = "Acme",
                currencyId = currencyId,
                hourlyRateCents = 7500,
                billingCycle = "monthly",
                paymentMethods = listOf("bank"),
            )

        assertNull(service.addClient(validRequest.copy(name = "   ")))
        assertNull(service.addClient(validRequest.copy(hourlyRateCents = -1)))
        assertNull(service.addClient(validRequest.copy(billingCycle = "yearly")))
        assertNull(service.addClient(validRequest.copy(paymentMethods = emptyList())))
        assertNull(service.addClient(validRequest.copy(paymentMethods = listOf("cash"))))
        assertNull(service.addClient(validRequest.copy(currencyId = UUID.randomUUID().toString())))
    }

    @Test
    fun `getClients excludes deleted clients`() {
        ExposedTestDb.seedFreelanceClient(name = "Active")
        ExposedTestDb.seedFreelanceClient(name = "Deleted", isDeleted = true)

        val clients = service.getClients()

        assertEquals(1, clients.size)
        assertEquals("Active", clients[0].name)
    }

    @Test
    fun `getClientById returns null for invalid missing or deleted client`() {
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)

        assertNull(service.getClientById("not-a-uuid"))
        assertNull(service.getClientById(UUID.randomUUID().toString()))
        assertNull(service.getClientById(deletedClientId))
    }

    @Test
    fun `updateClient updates active client`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId)

        val clientWasUpdated =
            service.updateClient(
                clientId,
                FreelanceClientUpsert(
                    name = "Updated",
                    currencyId = currencyId,
                    hourlyRateCents = 9000,
                    billingCycle = "weekly",
                    paymentMethods = listOf("lightning", "bank"),
                ),
            )

        assertTrue(clientWasUpdated)
        val client = service.getClientById(clientId)
        assertNotNull(client)
        assertEquals("Updated", client.name)
        assertEquals(9000, client.hourlyRateCents)
        assertEquals("weekly", client.billingCycle)
        assertEquals("lightning", client.paymentMethod)
        assertEquals(listOf("lightning", "bank"), client.paymentMethods)
    }

    @Test
    fun `updateClient returns false for invalid missing or deleted client`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val deletedClientId = ExposedTestDb.seedFreelanceClient(currencyId = currencyId, isDeleted = true)
        val validRequest =
            FreelanceClientUpsert(
                name = "Updated",
                currencyId = currencyId,
                hourlyRateCents = 9000,
                billingCycle = "weekly",
                paymentMethods = listOf("lightning"),
            )

        assertFalse(service.updateClient("not-a-uuid", validRequest))
        assertFalse(service.updateClient(UUID.randomUUID().toString(), validRequest))
        assertFalse(service.updateClient(deletedClientId, validRequest))
        assertFalse(service.updateClient(deletedClientId, validRequest.copy(name = " ")))
    }

    @Test
    fun `deleteClient soft deletes client`() {
        val clientId = ExposedTestDb.seedFreelanceClient()

        val clientWasDeleted = service.deleteClient(clientId)

        assertTrue(clientWasDeleted)
        assertNull(service.getClientById(clientId))
    }

    @Test
    fun `deleteClient returns false for invalid missing or already deleted client`() {
        val deletedClientId = ExposedTestDb.seedFreelanceClient(isDeleted = true)

        assertFalse(service.deleteClient("not-a-uuid"))
        assertFalse(service.deleteClient(UUID.randomUUID().toString()))
        assertFalse(service.deleteClient(deletedClientId))
    }
}
