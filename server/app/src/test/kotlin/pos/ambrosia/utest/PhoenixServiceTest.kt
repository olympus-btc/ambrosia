package pos.ambrosia.utest

import io.ktor.client.* 
import io.ktor.client.engine.mock.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.config.*
import io.ktor.utils.io.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.mockito.kotlin.*
import pos.ambrosia.models.Phoenix.NodeInfo
import pos.ambrosia.services.PhoenixService
import java.io.IOException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PhoenixServiceTest {

    private val mockConfig: ApplicationConfig = mock()
    private val mockEnv: ApplicationEnvironment = mock {
        on { config } doReturn mockConfig
    }

    @Test
    fun `getNodeInfo returns NodeInfo on success`() {
        // Arrange: Define the successful JSON response
        val mockJsonResponse = """
            {
                "nodeId": "02f3c93f2bsd...",
                "channels": [],
                "chain": "mainnet",
                "blockHeight": 800000,
                "version": "v0.1.0"
            }
        """.trimIndent()

        // Arrange: Create a MockEngine to deliver the successful response
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }

        // Arrange: Create an HttpClient that uses our MockEngine and can handle JSON
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }

        // Arrange: Mock the environment configuration (still needed for the constructor)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)

        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        // Act: Create the service using the NEW constructor, injecting the mock client
        val phoenixService = PhoenixService(mockEnv, mockHttpClient)
        val nodeInfo = runBlocking { phoenixService.getNodeInfo() }

        // Assert: Verify the data was parsed correctly
        assertEquals("mainnet", nodeInfo.chain)
        assertEquals(800000, nodeInfo.blockHeight)
        assertEquals("v0.1.0", nodeInfo.version)
    }

    @Test
    fun `getNodeInfo throws PhoenixNodeInfoException on non-200 response`() {
        // Arrange: Configure the MockEngine to return a server error
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)

        // Arrange: Mock the environment configuration
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert: Expect a PhoenixNodeInfoException
        assertFailsWith<pos.ambrosia.utils.PhoenixNodeInfoException> {
            runBlocking { phoenixService.getNodeInfo() }
        }
    }

    @Test
    fun `getNodeInfo throws PhoenixConnectionException on network error`() {
        // Arrange: Configure the MockEngine to throw a network error
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)

        // Arrange: Mock the environment configuration
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert: Expect a PhoenixConnectionException
        assertFailsWith<pos.ambrosia.utils.PhoenixConnectionException> {
            runBlocking { phoenixService.getNodeInfo() }
        }
    }

    @Test
    fun `getBalance returns PhoenixBalance on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "balanceSat": 100000,
                "feeCreditSat": 1000
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val balance = runBlocking { phoenixService.getBalance() }

        // Assert
        assertEquals(100000, balance.balanceSat)
    }

    @Test
    fun `getBalance throws PhoenixBalanceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixBalanceException> {
            runBlocking { phoenixService.getBalance() }
        }
    }

    @Test
    fun `getBalance throws PhoenixConnectionException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixConnectionException> {
            runBlocking { phoenixService.getBalance() }
        }
    }

    @Test
    fun `createInvoice returns CreateInvoiceResponse on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "amountSat": 1000,
                "paymentHash": "hash",
                "serialized": "lnbc10..."
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.CreateInvoiceRequest(description = "test")
        val invoiceResponse = runBlocking { phoenixService.createInvoice(request) }

        // Assert
        assertEquals(1000, invoiceResponse.amountSat)
        assertEquals("hash", invoiceResponse.paymentHash)
    }

    @Test
    fun `createInvoice throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.CreateInvoiceRequest(description = "test")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.createInvoice(request) }
        }
    }

    @Test
    fun `createInvoice throws PhoenixConnectionException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.CreateInvoiceRequest(description = "test")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.createInvoice(request) }
        }
    }

    @Test
    fun `createOffer returns String on success`() {
        // Arrange
        val mockStringResponse = "lno1234567890"

        val mockEngine = MockEngine { request ->
            respond(
                content = mockStringResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "text/plain")
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.CreateOffer(description = "test")
        val offerResponse = runBlocking { phoenixService.createOffer(request) }

        // Assert
        assertEquals("lno1234567890", offerResponse)
    }

    @Test
    fun `createOffer throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.CreateOffer(description = "test")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.createOffer(request) }
        }
    }

    @Test
    fun `createOffer throws PhoenixConnectionException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.CreateOffer(description = "test")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.createOffer(request) }
        }
    }

    @Test
    fun `payInvoice returns PaymentResponse on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "recipientAmountSat": 1000,
                "routingFeeSat": 10,
                "paymentId": "payment-id",
                "paymentHash": "payment-hash",
                "paymentPreimage": "payment-preimage"
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.PayInvoiceRequest(invoice = "lnbc10...")
        val paymentResponse = runBlocking { phoenixService.payInvoice(request) }

        // Assert
        assertEquals(1000, paymentResponse.recipientAmountSat)
        assertEquals("payment-id", paymentResponse.paymentId)
    }

    @Test
    fun `payInvoice throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayInvoiceRequest(invoice = "lnbc10...")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payInvoice(request) }
        }
    }

    @Test
    fun `payInvoice throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayInvoiceRequest(invoice = "lnbc10...")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payInvoice(request) }
        }
    }

    @Test
    fun `payOffer returns PaymentResponse on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "recipientAmountSat": 2000,
                "routingFeeSat": 20,
                "paymentId": "offer-payment-id",
                "paymentHash": "offer-payment-hash",
                "paymentPreimage": "offer-payment-preimage"
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.PayOfferRequest(offer = "lno1...")
        val paymentResponse = runBlocking { phoenixService.payOffer(request) }

        // Assert
        assertEquals(2000, paymentResponse.recipientAmountSat)
        assertEquals("offer-payment-id", paymentResponse.paymentId)
    }

    @Test
    fun `payOffer throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayOfferRequest(offer = "lno1...")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payOffer(request) }
        }
    }

    @Test
    fun `payOffer throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayOfferRequest(offer = "lno1...")
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payOffer(request) }
        }
    }

    @Test
    fun `payOnchain returns PaymentResponse on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "recipientAmountSat": 50000,
                "routingFeeSat": 0,
                "paymentId": "onchain-payment-id",
                "paymentHash": "onchain-payment-hash",
                "paymentPreimage": "onchain-payment-preimage"
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.PayOnchainRequest(address = "bc1q...", amountSat = 50000, feerateSatByte = 10)
        val paymentResponse = runBlocking { phoenixService.payOnchain(request) }

        // Assert
        assertEquals(50000, paymentResponse.recipientAmountSat)
        assertEquals("onchain-payment-id", paymentResponse.paymentId)
    }

    @Test
    fun `payOnchain throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayOnchainRequest(address = "bc1q...", amountSat = 50000, feerateSatByte = 10)
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payOnchain(request) }
        }
    }

    @Test
    fun `payOnchain throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.PayOnchainRequest(address = "bc1q...", amountSat = 50000, feerateSatByte = 10)
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.payOnchain(request) }
        }
    }

    @Test
    fun `bumpOnchainFees returns String on success`() {
        // Arrange
        val mockStringResponse = "Fees bumped"
        val mockEngine = MockEngine { request ->
            respond(
                content = mockStringResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "text/plain")
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val response = runBlocking { phoenixService.bumpOnchainFees(10) }

        // Assert
        assertEquals("Fees bumped", response)
    }

    @Test
    fun `bumpOnchainFees throws PhoenixServiceException on non-200 response` () {
        //Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
                runBlocking { phoenixService.bumpOnchainFees(10)}
        }
    }

    @Test
    fun `bumpOnchainFees throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.bumpOnchainFees(10) }
        }
    }

    @Test
    fun `closeChannel returns txId string on success`() {
        // Arrange
        val mockStringResponse = "txId12345"
        val mockEngine = MockEngine { request ->
            respond(
                content = mockStringResponse,
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "text/plain")
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val request = pos.ambrosia.models.Phoenix.CloseChannelRequest(channelId = "channelId", address = "address", feerateSatByte = 10)
        val response = runBlocking { phoenixService.closeChannel(request) }

        // Assert
        assertEquals("txId12345", response)
    }

    @Test
    fun `closeChannel throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        val request = pos.ambrosia.models.Phoenix.CloseChannelRequest(channelId = "channelId", address = "address", feerateSatByte = 10)
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.closeChannel(request) }
        }
    }

    @Test
    fun `listIncomingPayments returns List of IncomingPayment on success`() {
        // Arrange
        val mockJsonResponse = """
            [
                {
                    "type": "incoming",
                    "subType": "ln",
                    "paymentHash": "hash1",
                    "preimage": "preimage1",
                    "externalId": "ext1",
                    "description": "desc1",
                    "invoice": "lnbc1...",
                    "isPaid": true,
                    "receivedSat": 1000,
                    "fees": 10,
                    "createdAt": 1620000000
                }
            ]
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val payments = runBlocking { phoenixService.listIncomingPayments() }

        // Assert
        assertEquals(1, payments.size)
        assertEquals("hash1", payments[0].paymentHash)
    }

    @Test
    fun `listIncomingPayments throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.listIncomingPayments() }
        }
    }

    @Test
    fun `listIncomingPayments throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.listIncomingPayments() }
        }
    }

    @Test
    fun `getIncomingPayment returns IncomingPayment on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "type": "incoming",
                "subType": "ln",
                "paymentHash": "hash-single",
                "preimage": "preimage-single",
                "externalId": "ext-single",
                "description": "desc-single",
                "invoice": "lnbc2...",
                "isPaid": true,
                "receivedSat": 2000,
                "fees": 20,
                "createdAt": 1620000200
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val payment = runBlocking { phoenixService.getIncomingPayment("hash-single") }

        // Assert
        assertEquals("hash-single", payment.paymentHash)
        assertEquals(2000, payment.receivedSat)
    }

    @Test
    fun `getIncomingPayment throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getIncomingPayment("hash-single") }
        }
    }

    @Test
    fun `getIncomingPayment throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getIncomingPayment("hash-single") }
        }
    }

    @Test
    fun `listOutgoingPayments returns List of OutgoingPayment on success`() {
        // Arrange
        val mockJsonResponse = """
            [
                {
                    "type": "outgoing",
                    "subType": "ln",
                    "paymentId": "id1",
                    "paymentHash": "hash1",
                    "preimage": "preimage1",
                    "isPaid": true,
                    "sent": 1000,
                    "fees": 10,
                    "createdAt": 1620000000
                }
            ]
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val payments = runBlocking { phoenixService.listOutgoingPayments() }

        // Assert
        assertEquals(1, payments.size)
        assertEquals("id1", payments[0].paymentId)
    }

    @Test
    fun `listOutgoingPayments throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.listOutgoingPayments() }
        }
    }

    @Test
    fun `listOutgoingPayments throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.listOutgoingPayments() }
        }
    }

    @Test
    fun `getOutgoingPayment returns OutgoingPayment on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "type": "outgoing",
                "subType": "ln",
                "paymentId": "id-single",
                "paymentHash": "hash-single",
                "preimage": "preimage-single",
                "isPaid": true,
                "sent": 3000,
                "fees": 30,
                "createdAt": 1620000300
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val payment = runBlocking { phoenixService.getOutgoingPayment("id-single") }

        // Assert
        assertEquals("id-single", payment.paymentId)
        assertEquals(3000, payment.sent)
    }

    @Test
    fun `getOutgoingPayment throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getOutgoingPayment("id-single") }
        }
    }

    @Test
    fun `getOutgoingPayment throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getOutgoingPayment("id-single") }
        }
    }

    @Test
    fun `getOutgoingPaymentByHash returns OutgoingPayment on success`() {
        // Arrange
        val mockJsonResponse = """
            {
                "type": "outgoing",
                "subType": "ln",
                "paymentId": "id-hash",
                "paymentHash": "hash-hash",
                "preimage": "preimage-hash",
                "isPaid": true,
                "sent": 4000,
                "fees": 40,
                "createdAt": 1620000400
            }
        """.trimIndent()
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(mockJsonResponse.toByteArray(Charsets.UTF_8)),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json")
            )
        }
        val mockHttpClient = HttpClient(mockEngine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act
        val payment = runBlocking { phoenixService.getOutgoingPaymentByHash("hash-hash") }

        // Assert
        assertEquals("id-hash", payment.paymentId)
        assertEquals("hash-hash", payment.paymentHash)
        assertEquals(4000, payment.sent)
    }

    @Test
    fun `getOutgoingPaymentByHash throws PhoenixServiceException on non-200 response`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            respond(
                content = ByteReadChannel(""),
                status = HttpStatusCode.InternalServerError
            )
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getOutgoingPaymentByHash("hash-hash") }
        }
    }

    @Test
    fun `getOutgoingPaymentByHash throws PhoenixServiceException on network error`() {
        // Arrange
        val mockEngine = MockEngine { request ->
            throw IOException("Network error")
        }
        val mockHttpClient = HttpClient(mockEngine)
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)

        val phoenixService = PhoenixService(mockEnv, mockHttpClient)

        // Act & Assert
        assertFailsWith<pos.ambrosia.utils.PhoenixServiceException> {
            runBlocking { phoenixService.getOutgoingPaymentByHash("hash-hash") }
        }
    }
}