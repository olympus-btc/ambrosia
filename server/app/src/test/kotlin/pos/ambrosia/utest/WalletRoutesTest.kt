package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import org.junit.After
import pos.ambrosia.api.wallet
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.models.phoenix.OutgoingPayment
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.RefundService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.FakeLightningBackend
import pos.ambrosia.utils.PhoenixConnectionException
import pos.ambrosia.utils.installRoutes
import pos.ambrosia.utils.installWalletAuth
import pos.ambrosia.utils.jsonBody
import pos.ambrosia.utils.routeTest
import pos.ambrosia.utils.testEnvironment
import pos.ambrosia.utils.tokenService
import pos.ambrosia.utils.withAccessTokenOnly
import pos.ambrosia.utils.withAuthCookies
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WalletRoutesTest {
    private val backend = FakeLightningBackend()

    @After
    fun tearDown() {
        ActiveLightningBackend.closeActive()
    }

    @Test
    fun `wallet endpoints reject an access token without a wallet token`() =
        walletTest { auth ->
            val balanceResponse = client.get("/wallet/getbalance") { withAccessTokenOnly(auth) }
            val seedResponse = client.get("/wallet/seed") { withAccessTokenOnly(auth) }

            assertEquals(HttpStatusCode.Unauthorized, balanceResponse.status)
            assertEquals(HttpStatusCode.Unauthorized, seedResponse.status)
        }

    @Test
    fun `wallet endpoints accept a valid wallet token`() =
        walletTest { auth ->
            backend.balanceSat = 4242

            val balanceResponse = client.get("/wallet/getbalance") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, balanceResponse.status)
            assertTrue(balanceResponse.bodyAsText().contains("4242"))
        }

    @Test
    fun `invoice creation only needs the standard access token`() =
        walletTest { auth ->
            val invoiceResponse =
                client.post("/wallet/invoice") {
                    withAccessTokenOnly(auth)
                    jsonBody("""{"description":"coffee","amountSat":1000}""")
                }

            assertEquals(HttpStatusCode.OK, invoiceResponse.status)
            assertEquals(1, backend.createInvoiceRequests.size)
            assertEquals(1000L, backend.createInvoiceRequests.single().amountSat)
        }

    @Test
    fun `wallet auth issues a scoped strict cookie for the correct role password`() =
        walletTest { auth ->
            val walletAuthResponse =
                client.post("/wallet/auth") {
                    withAccessTokenOnly(auth)
                    jsonBody("""{"password":"wallet-password"}""")
                }

            assertEquals(HttpStatusCode.OK, walletAuthResponse.status)
            val setCookie = walletAuthResponse.headers[HttpHeaders.SetCookie] ?: ""
            assertTrue(setCookie.contains("walletAccessToken="), "expected a walletAccessToken cookie")
            assertTrue(setCookie.contains("HttpOnly", ignoreCase = true), "wallet cookie must be HttpOnly")
            assertTrue(setCookie.contains("SameSite=Strict"), "wallet cookie must be SameSite=Strict")
        }

    @Test
    fun `wallet auth rejects a wrong role password without issuing a cookie`() =
        walletTest { auth ->
            val walletAuthResponse =
                client.post("/wallet/auth") {
                    withAccessTokenOnly(auth)
                    jsonBody("""{"password":"not-the-password"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, walletAuthResponse.status)
            assertNull(walletAuthResponse.headers[HttpHeaders.SetCookie])
        }

    @Test
    fun `wallet logout revokes the token in the database`() =
        walletTest { auth ->
            val beforeLogout = client.get("/wallet/getbalance") { withAuthCookies(auth) }
            val logoutResponse = client.post("/wallet/logout") { withAccessTokenOnly(auth) }
            val afterLogout = client.get("/wallet/getbalance") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, beforeLogout.status)
            assertEquals(HttpStatusCode.OK, logoutResponse.status)
            assertEquals(HttpStatusCode.Unauthorized, afterLogout.status)
        }

    @Test
    fun `a token without the wallet access scope is rejected`() =
        walletTest { auth ->
            val accessTokenAsWalletCookie = auth.copy(walletAccessToken = auth.accessToken)

            val balanceResponse = client.get("/wallet/getbalance") { withAuthCookies(accessTokenAsWalletCookie) }

            assertEquals(HttpStatusCode.Unauthorized, balanceResponse.status)
        }

    @Test
    fun `pay invoice delegates to the lightning backend and echoes the settled amount`() =
        walletTest { auth ->
            val payResponse =
                client.post("/wallet/payinvoice") {
                    withAuthCookies(auth)
                    jsonBody("""{"invoice":"lnbc1test","amountSat":2500}""")
                }

            assertEquals(HttpStatusCode.OK, payResponse.status)
            assertEquals(1, backend.payInvoiceRequests.size)
            assertEquals("lnbc1test", backend.payInvoiceRequests.single().invoice)
            assertTrue(payResponse.bodyAsText().contains("2500"))
        }

    @Test
    fun `pay onchain delegates the address and amount to the lightning backend`() =
        walletTest { auth ->
            val payResponse =
                client.post("/wallet/payonchain") {
                    withAuthCookies(auth)
                    jsonBody("""{"amountSat":30000,"address":"bc1qtest","feerateSatByte":5}""")
                }

            assertEquals(HttpStatusCode.OK, payResponse.status)
            val request = backend.payOnchainRequests.single()
            assertEquals("bc1qtest", request.address)
            assertEquals(30000L, request.amountSat)
        }

    @Test
    fun `a backend failure on pay invoice surfaces as service unavailable`() =
        walletTest { auth ->
            backend.failNextPayment = PhoenixConnectionException()

            val payResponse =
                client.post("/wallet/payinvoice") {
                    withAuthCookies(auth)
                    jsonBody("""{"invoice":"lnbc1test","amountSat":2500}""")
                }

            assertEquals(HttpStatusCode.ServiceUnavailable, payResponse.status)
        }

    @Test
    fun `close channel delegates to the lightning backend`() =
        walletTest { auth ->
            val closeResponse =
                client.post("/wallet/closechannel") {
                    withAuthCookies(auth)
                    jsonBody("""{"channelId":"chan-1","address":"bc1qtest","feerateSatByte":3}""")
                }

            assertEquals(HttpStatusCode.OK, closeResponse.status)
            assertEquals("chan-1", backend.closeChannelRequests.single().channelId)
        }

    @Test
    fun `node info and seed are served from the active backend`() =
        walletTest { auth ->
            val infoResponse = client.get("/wallet/getinfo") { withAuthCookies(auth) }
            val seedResponse = client.get("/wallet/seed") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, infoResponse.status)
            assertEquals(HttpStatusCode.OK, seedResponse.status)
            assertTrue(infoResponse.bodyAsText().contains("fake-backend"))
        }

    @Test
    fun `bumping onchain fees and exporting delegate to the backend`() =
        walletTest { auth ->
            val bumpResponse =
                client.post("/wallet/bumpfee") {
                    withAuthCookies(auth)
                    jsonBody("5")
                }
            val exportResponse =
                client.post("/wallet/export") {
                    withAuthCookies(auth)
                    jsonBody("""{"from":0,"to":0}""")
                }

            assertEquals(HttpStatusCode.OK, bumpResponse.status)
            assertEquals(HttpStatusCode.OK, exportResponse.status)
        }

    @Test
    fun `an undecodable invoice is a bad request`() =
        walletTest { auth ->
            val response =
                client.post("/wallet/decodeinvoice") {
                    withAuthCookies(auth)
                    jsonBody("""{"invoice":"definitely-not-a-bolt11"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `changing the wallet password requires both fields`() =
        walletTest { auth ->
            val response =
                client.post("/wallet/password") {
                    withAuthCookies(auth)
                    jsonBody("""{"currentPassword":"","newPassword":"whatever"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `changing the wallet password rejects a wrong current password`() =
        walletTest { auth ->
            val response =
                client.post("/wallet/password") {
                    withAuthCookies(auth)
                    jsonBody("""{"currentPassword":"wrong","newPassword":"new-password"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    @Test
    fun `changing the wallet password succeeds and the new one authenticates`() =
        walletTest { auth ->
            val changeResponse =
                client.post("/wallet/password") {
                    withAuthCookies(auth)
                    jsonBody("""{"currentPassword":"wallet-password","newPassword":"new-password"}""")
                }
            val reauthResponse =
                client.post("/wallet/auth") {
                    withAccessTokenOnly(auth)
                    jsonBody("""{"password":"new-password"}""")
                }

            assertEquals(HttpStatusCode.OK, changeResponse.status)
            assertEquals(HttpStatusCode.OK, reauthResponse.status)
        }

    @Test
    fun `updating the nwc uri is refused when nwc is not the active backend`() =
        walletTest { auth ->
            val response =
                client.post("/wallet/updatenwcuri") {
                    withAuthCookies(auth)
                    jsonBody("""{"nwcUri":"nostr+walletconnect://abc"}""")
                }

            assertEquals(HttpStatusCode.NotImplemented, response.status)
            assertTrue(response.bodyAsText().contains("provider_switch_not_supported"))
        }

    @Test
    fun `a blank nwc uri is a bad request`() =
        walletTest { auth ->
            val response =
                client.post("/wallet/updatenwcuri") {
                    withAuthCookies(auth)
                    jsonBody("""{"nwcUri":"   "}""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `incoming payments are listed and marked unrefunded by default`() =
        walletTest { auth ->
            backend.incomingPayments =
                listOf(
                    IncomingPayment(
                        type = "incoming_payment",
                        subType = "lightning",
                        paymentHash = "hash-in-1",
                        isPaid = true,
                        receivedSat = 1500,
                        fees = 0,
                        createdAt = 0,
                    ),
                )

            val response = client.get("/wallet/payments/incoming") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            val body = response.bodyAsText()
            assertTrue(body.contains("hash-in-1"))
            assertTrue(body.contains("\"refunded\":false"))
        }

    @Test
    fun `an incoming payment is enriched with the sale exchange rate`() =
        walletTest { auth ->
            ExposedTestDb.seedPayment(
                paymentHash = "hash-in-2",
                exchangeRateAtPayment = 65000.0,
                exchangeRateCurrency = "USD",
                fiatAmountAtPayment = 9.75,
            )
            backend.incomingPayments =
                listOf(
                    IncomingPayment(
                        type = "incoming_payment",
                        subType = "lightning",
                        paymentHash = "hash-in-2",
                        isPaid = true,
                        receivedSat = 1500,
                        fees = 0,
                        createdAt = 0,
                    ),
                )

            val response = client.get("/wallet/payments/incoming") { withAuthCookies(auth) }

            val body = response.bodyAsText()
            assertTrue(body.contains("65000"), "expected the sale exchange rate")
            assertTrue(body.contains("USD"))
        }

    @Test
    fun `outgoing payments are listed`() =
        walletTest { auth ->
            backend.outgoingPayments =
                listOf(
                    OutgoingPayment(
                        type = "outgoing_payment",
                        subType = "lightning",
                        paymentId = "out-1",
                        paymentHash = "hash-out-1",
                        isPaid = true,
                        sent = 800,
                        fees = 1,
                        createdAt = 0,
                    ),
                )

            val response = client.get("/wallet/payments/outgoing") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("hash-out-1"))
        }

    @Test
    fun `a single payment can be fetched by hash and by id`() =
        walletTest { auth ->
            val incomingResponse = client.get("/wallet/payments/incoming/hash-1") { withAuthCookies(auth) }
            val outgoingResponse = client.get("/wallet/payments/outgoing/out-1") { withAuthCookies(auth) }
            val byHashResponse = client.get("/wallet/payments/outgoingbyhash/hash-1") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, incomingResponse.status)
            assertEquals(HttpStatusCode.OK, outgoingResponse.status)
            assertEquals(HttpStatusCode.OK, byHashResponse.status)
        }

    @Test
    fun `payment listings are wallet-scoped`() =
        walletTest { auth ->
            val incomingResponse = client.get("/wallet/payments/incoming") { withAccessTokenOnly(auth) }
            val outgoingResponse = client.get("/wallet/payments/outgoing") { withAccessTokenOnly(auth) }

            assertEquals(HttpStatusCode.Unauthorized, incomingResponse.status)
            assertEquals(HttpStatusCode.Unauthorized, outgoingResponse.status)
        }

    @Test
    fun `unauthenticated requests never reach the wallet`() =
        walletTest {
            val balanceResponse = client.get("/wallet/getbalance")
            val seedResponse = client.get("/wallet/seed")
            val invoiceResponse =
                client.post("/wallet/invoice") {
                    header(HttpHeaders.ContentType, "application/json")
                    jsonBody("""{"description":"coffee","amountSat":1000}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, balanceResponse.status)
            assertEquals(HttpStatusCode.Unauthorized, seedResponse.status)
            assertEquals(HttpStatusCode.Unauthorized, invoiceResponse.status)
            assertTrue(backend.createInvoiceRequests.isEmpty())
        }

    private fun walletTest(block: suspend io.ktor.server.testing.ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            ActiveLightningBackend.set(backend)
            val auth = installWalletAuth()
            val environment = testEnvironment()
            installRoutes {
                routing {
                    route("/wallet") {
                        wallet(
                            tokenService(),
                            AuthService(environment),
                            RolesService(environment),
                            PaymentService(),
                            WalletRateService(),
                            RefundService(ActiveLightningBackend),
                            WalletAdminNotificationService(),
                        )
                    }
                }
            }
            block(auth)
        }
}
