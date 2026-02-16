package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Ticket
import pos.ambrosia.services.TicketService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class TicketServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getTickets returns list of tickets when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ticket-1").thenReturn("ticket-2") // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn("order-1").thenReturn("order-2") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1").thenReturn("user-2") // Arrange
            whenever(mockResultSet.getString("ticket_date")).thenReturn("date-1").thenReturn("date-2") // Arrange
            whenever(mockResultSet.getInt("status")).thenReturn(1).thenReturn(1) // Arrange
            whenever(mockResultSet.getDouble("total_amount")).thenReturn(100.0).thenReturn(200.0) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn("note-1").thenReturn("note-2") // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTickets() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("ticket-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getTickets returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTickets() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getTicketById returns ticket when found`() {
        runBlocking {
            val expectedTicket = Ticket("ticket-1", "order-1", "user-1", "date-1", 1, 100.0, "note-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedTicket.id) // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn(expectedTicket.order_id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedTicket.user_id) // Arrange
            whenever(mockResultSet.getString("ticket_date")).thenReturn(expectedTicket.ticket_date) // Arrange
            whenever(mockResultSet.getInt("status")).thenReturn(expectedTicket.status) // Arrange
            whenever(mockResultSet.getDouble("total_amount")).thenReturn(expectedTicket.total_amount) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn(expectedTicket.notes) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketById("ticket-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedTicket, result) // Assert
        }
    }

    @Test
    fun `getTicketById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getTicketsByOrder returns tickets when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ticket-1") // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("ticket_date")).thenReturn("date-1") // Arrange
            whenever(mockResultSet.getInt("status")).thenReturn(1) // Arrange
            whenever(mockResultSet.getDouble("total_amount")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn("note-1") // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketsByOrder("order-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("ticket-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getTicketsByOrder returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketsByOrder("order-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getTicketsByUser returns tickets when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ticket-1") // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("ticket_date")).thenReturn("date-1") // Arrange
            whenever(mockResultSet.getInt("status")).thenReturn(1) // Arrange
            whenever(mockResultSet.getDouble("total_amount")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn("note-1") // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketsByUser("user-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("ticket-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getTicketsByUser returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.getTicketsByUser("user-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addTicket returns null if order does not exist`() {
        runBlocking {
            val newTicket = Ticket(null, "non-existent-order", "user-1", "date-1", 1, 100.0, "note-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.addTicket(newTicket) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTicket returns null if user does not exist`() {
        runBlocking {
            val newTicket = Ticket(null, "order-1", "non-existent-user", "date-1", 1, 100.0, "note-1") // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(false) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.addTicket(newTicket) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTicket returns null if status is invalid`() {
        runBlocking {
            val newTicket = Ticket(null, "order-1", "user-1", "date-1", 2, 100.0, "note-1") // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.addTicket(newTicket) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTicket returns new ID on success`() {
        runBlocking {
            val newTicket = Ticket(null, "order-1", "user-1", "date-1", 1, 100.0, "note-1") // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(addStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.addTicket(newTicket) // Act
            assertNotNull(result) // Assert
        }
    }

    @Test
    fun `addTicket returns null when database insert fails`() {
        runBlocking {
            val newTicket = Ticket(null, "order-1", "user-1", "date-1", 1, 100.0, "note-1") // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(addStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.addTicket(newTicket) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateTicket returns false if ID is null`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = null,
                    order_id = "order-1",
                    user_id = "user-1",
                    ticket_date = "date-1",
                    status = 1,
                    total_amount = 100.0,
                    notes = "note-1",
                ) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateTicket returns false if order does not exist`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = "ticket-1",
                    order_id = "non-existent-order",
                    user_id = "user-1",
                    ticket_date = "date-1",
                    status = 1,
                    total_amount = 100.0,
                    notes = "note-1",
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTicket returns false if user does not exist`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = "ticket-1",
                    order_id = "order-1",
                    user_id = "non-existent-user",
                    ticket_date = "date-1",
                    status = 1,
                    total_amount = 100.0,
                    notes = "note-1",
                ) // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(false) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTicket returns false if status is invalid`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = "ticket-1",
                    order_id = "order-1",
                    user_id = "user-1",
                    ticket_date = "date-1",
                    status = 2,
                    total_amount = 100.0,
                    notes = "note-1",
                ) // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTicket returns true on success`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = "ticket-1",
                    order_id = "order-1",
                    user_id = "user-1",
                    ticket_date = "date-1",
                    status = 1,
                    total_amount = 150.0,
                    notes = "updated note",
                ) // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE tickets"))).thenReturn(updateStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateTicket returns false when database update fails`() {
        runBlocking {
            val ticket =
                Ticket(
                    id = "ticket-1",
                    order_id = "order-1",
                    user_id = "user-1",
                    ticket_date = "date-1",
                    status = 1,
                    total_amount = 150.0,
                    notes = "updated note",
                ) // Arrange
            val orderCheckStatement: PreparedStatement = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("orders"))).thenReturn(orderCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE tickets"))).thenReturn(updateStatement) // Arrange
            val orderResultSet: ResultSet = mock() // Arrange
            whenever(orderResultSet.next()).thenReturn(true) // Arrange
            whenever(orderCheckStatement.executeQuery()).thenReturn(orderResultSet) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.updateTicket(ticket) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteTicket returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.deleteTicket("ticket-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteTicket returns false when ticket not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TicketService(mockConnection) // Arrange
            val result = service.deleteTicket("not-found-ticket") // Act
            assertFalse(result) // Assert
        }
    }
}
