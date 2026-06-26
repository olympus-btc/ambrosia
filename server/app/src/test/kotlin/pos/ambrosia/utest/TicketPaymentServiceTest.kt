package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.TicketPayment
import pos.ambrosia.services.TicketPaymentService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TicketPaymentServiceTest {
    private lateinit var dbFile: File
    private val service = TicketPaymentService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getTicketPaymentsByTicket returns list of payments when found`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId1 = ExposedTestDb.seedPayment()
            val paymentId2 = ExposedTestDb.seedPayment()
            ExposedTestDb.seedTicketPayment(paymentId1, ticketId)
            ExposedTestDb.seedTicketPayment(paymentId2, ticketId)

            val result = service.getTicketPaymentsByTicket(ticketId)
            assertEquals(2, result?.size)
            assertTrue(result!!.all { it.ticketId == ticketId })
        }
    }

    @Test
    fun `getTicketPaymentsByTicket returns empty list when none found`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)

            val result = service.getTicketPaymentsByTicket(ticketId)
            assertTrue(result?.isEmpty() ?: false)
        }
    }

    @Test
    fun `getTicketPaymentsByTicket returns null when ticket not found`() {
        runBlocking {
            val result = service.getTicketPaymentsByTicket(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getTicketPaymentsByPayment returns list of tickets when found`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId1 = ExposedTestDb.seedOrder(userId)
            val orderId2 = ExposedTestDb.seedOrder(userId)
            val ticketId1 = ExposedTestDb.seedTicket(orderId1, userId)
            val ticketId2 = ExposedTestDb.seedTicket(orderId2, userId)
            val paymentId = ExposedTestDb.seedPayment()
            ExposedTestDb.seedTicketPayment(paymentId, ticketId1)
            ExposedTestDb.seedTicketPayment(paymentId, ticketId2)

            val result = service.getTicketPaymentsByPayment(paymentId)
            assertEquals(2, result?.size)
            assertTrue(result!!.all { it.paymentId == paymentId })
        }
    }

    @Test
    fun `getTicketPaymentsByPayment returns empty list when none found`() {
        runBlocking {
            val paymentId = ExposedTestDb.seedPayment()
            val result = service.getTicketPaymentsByPayment(paymentId)
            assertTrue(result?.isEmpty() ?: false)
        }
    }

    @Test
    fun `getTicketPaymentsByPayment returns null when payment not found`() {
        runBlocking {
            val result = service.getTicketPaymentsByPayment(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `addTicketPayment returns false if paymentId is blank`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticketPayment = TicketPayment(paymentId = "", ticketId = ticketId)
            val result = service.addTicketPayment(ticketPayment)
            assertFalse(result)
        }
    }

    @Test
    fun `addTicketPayment returns false if ticketId is blank`() {
        runBlocking {
            val paymentId = ExposedTestDb.seedPayment()
            val ticketPayment = TicketPayment(paymentId = paymentId, ticketId = "")
            val result = service.addTicketPayment(ticketPayment)
            assertFalse(result)
        }
    }

    @Test
    fun `addTicketPayment returns false if ticketId does not exist`() {
        runBlocking {
            val paymentId = ExposedTestDb.seedPayment()
            val ticketPayment = TicketPayment(paymentId = paymentId, ticketId = UUID.randomUUID().toString())
            val result = service.addTicketPayment(ticketPayment)
            assertFalse(result)
        }
    }

    @Test
    fun `addTicketPayment returns false if paymentId does not exist`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val ticketPayment = TicketPayment(paymentId = UUID.randomUUID().toString(), ticketId = ticketId)
            val result = service.addTicketPayment(ticketPayment)
            assertFalse(result)
        }
    }

    @Test
    fun `addTicketPayment returns true on success`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId = ExposedTestDb.seedPayment()
            val ticketPayment = TicketPayment(paymentId = paymentId, ticketId = ticketId)
            val result = service.addTicketPayment(ticketPayment)
            assertTrue(result)
        }
    }

    @Test
    fun `deleteTicketPayment returns true on success`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId = ExposedTestDb.seedPayment()
            ExposedTestDb.seedTicketPayment(paymentId, ticketId)

            val result = service.deleteTicketPayment(paymentId, ticketId)
            assertTrue(result)
        }
    }

    @Test
    fun `deleteTicketPayment returns false when record not found`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId = ExposedTestDb.seedPayment()

            val result = service.deleteTicketPayment(paymentId, ticketId)
            assertFalse(result)
        }
    }

    @Test
    fun `deleteTicketPaymentsByTicket returns true on success`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val orderId = ExposedTestDb.seedOrder(userId)
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            val paymentId1 = ExposedTestDb.seedPayment()
            val paymentId2 = ExposedTestDb.seedPayment()
            ExposedTestDb.seedTicketPayment(paymentId1, ticketId)
            ExposedTestDb.seedTicketPayment(paymentId2, ticketId)

            val result = service.deleteTicketPaymentsByTicket(ticketId)
            assertTrue(result)
            assertTrue(service.getTicketPaymentsByTicket(ticketId)?.isEmpty() ?: false)
        }
    }
}
