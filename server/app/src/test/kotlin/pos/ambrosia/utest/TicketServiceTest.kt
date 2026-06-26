package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Ticket
import pos.ambrosia.services.TicketService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TicketServiceTest {
    private lateinit var dbFile: File
    private val service = TicketService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private fun seedOrderAndUser(): Pair<String, String> {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        val userId = ExposedTestDb.seedUser("Alice", roleId)
        val orderId = ExposedTestDb.seedOrder(userId)
        return Pair(orderId, userId)
    }

    @Test
    fun `getTickets returns list of tickets when found`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId1 = ExposedTestDb.seedTicket(orderId, userId)
            val ticketId2 = ExposedTestDb.seedTicket(orderId, userId)

            val result = service.getTickets()
            assertEquals(2, result.size)
            assertTrue(result.any { it.id == ticketId1 })
            assertTrue(result.any { it.id == ticketId2 })
        }
    }

    @Test
    fun `getTickets returns empty list when none found`() {
        runBlocking {
            val result = service.getTickets()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getTicketById returns ticket when found`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)

            val result = service.getTicketById(ticketId)
            assertNotNull(result)
            assertEquals(ticketId, result.id)
            assertEquals(orderId, result.orderId)
            assertEquals(userId, result.userId)
        }
    }

    @Test
    fun `getTicketById returns null when not found`() {
        runBlocking {
            val result = service.getTicketById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getTicketsByOrder returns tickets when found`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val (otherOrderId, _) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            ExposedTestDb.seedTicket(otherOrderId, userId)

            val result = service.getTicketsByOrder(orderId)
            assertEquals(1, result.size)
            assertEquals(ticketId, result[0].id)
        }
    }

    @Test
    fun `getTicketsByOrder returns empty list when none found`() {
        runBlocking {
            val (orderId, _) = seedOrderAndUser()
            val result = service.getTicketsByOrder(orderId)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getTicketsByUser returns tickets when found`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)

            val result = service.getTicketsByUser(userId)
            assertEquals(1, result.size)
            assertEquals(ticketId, result[0].id)
        }
    }

    @Test
    fun `getTicketsByUser returns empty list when none found`() {
        runBlocking {
            val (_, userId) = seedOrderAndUser()
            val result = service.getTicketsByUser(userId)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `addTicket returns null if order does not exist`() {
        runBlocking {
            val (_, userId) = seedOrderAndUser()
            val newTicket = Ticket(null, UUID.randomUUID().toString(), userId, "date-1", 1, 100.0, "note-1")
            val result = service.addTicket(newTicket)
            assertNull(result)
        }
    }

    @Test
    fun `addTicket returns null if user does not exist`() {
        runBlocking {
            val (orderId, _) = seedOrderAndUser()
            val newTicket = Ticket(null, orderId, UUID.randomUUID().toString(), "date-1", 1, 100.0, "note-1")
            val result = service.addTicket(newTicket)
            assertNull(result)
        }
    }

    @Test
    fun `addTicket returns null if status is invalid`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val newTicket = Ticket(null, orderId, userId, "date-1", 2, 100.0, "note-1")
            val result = service.addTicket(newTicket)
            assertNull(result)
        }
    }

    @Test
    fun `addTicket returns new ID on success`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val newTicket = Ticket(null, orderId, userId, "date-1", 1, 100.0, "note-1")
            val result = service.addTicket(newTicket)
            assertNotNull(result)
        }
    }

    @Test
    fun `updateTicket returns false if ID is null`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticket = Ticket(null, orderId, userId, "date-1", 1, 100.0, "note-1")
            val result = service.updateTicket(ticket)
            assertFalse(result)
        }
    }

    @Test
    fun `updateTicket returns false if order does not exist`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticket = Ticket(ticketId, UUID.randomUUID().toString(), userId, "date-1", 1, 100.0, "note-1")
            val result = service.updateTicket(ticket)
            assertFalse(result)
        }
    }

    @Test
    fun `updateTicket returns false if user does not exist`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticket = Ticket(ticketId, orderId, UUID.randomUUID().toString(), "date-1", 1, 100.0, "note-1")
            val result = service.updateTicket(ticket)
            assertFalse(result)
        }
    }

    @Test
    fun `updateTicket returns false if status is invalid`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticket = Ticket(ticketId, orderId, userId, "date-1", 2, 100.0, "note-1")
            val result = service.updateTicket(ticket)
            assertFalse(result)
        }
    }

    @Test
    fun `updateTicket returns true on success`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticket = Ticket(ticketId, orderId, userId, "date-1", 1, 150.0, "updated note")

            val result = service.updateTicket(ticket)
            assertTrue(result)
            val updated = service.getTicketById(ticketId)
            assertEquals(150.0, updated?.totalAmount)
            assertEquals("updated note", updated?.notes)
        }
    }

    @Test
    fun `deleteTicket returns true on success`() {
        runBlocking {
            val (orderId, userId) = seedOrderAndUser()
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)

            val result = service.deleteTicket(ticketId)
            assertTrue(result)
            assertNull(service.getTicketById(ticketId))
        }
    }

    @Test
    fun `deleteTicket returns false when ticket not found`() {
        runBlocking {
            val result = service.deleteTicket(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }
}
