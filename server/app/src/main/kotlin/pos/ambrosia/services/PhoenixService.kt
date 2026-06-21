package pos.ambrosia.services

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BasicAuthCredentials
import io.ktor.client.plugins.auth.providers.basic
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.Parameters
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.ApplicationEnvironment
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import pos.ambrosia.config.AppConfig
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CloseChannelResponse
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CreateInvoiceResponse
import pos.ambrosia.models.phoenix.CreateOffer
import pos.ambrosia.models.phoenix.CsvExport
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.models.phoenix.NodeInfo
import pos.ambrosia.models.phoenix.OutgoingPayment
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.models.phoenix.PayOnchainRequest
import pos.ambrosia.models.phoenix.PaymentResponse
import pos.ambrosia.models.phoenix.PhoenixBalance
import pos.ambrosia.utils.Bolt11Decoder
import pos.ambrosia.utils.PhoenixBalanceException
import pos.ambrosia.utils.PhoenixConnectionException
import pos.ambrosia.utils.PhoenixNodeInfoException
import pos.ambrosia.utils.PhoenixServiceException

/** Service for interacting with Phoenix Lightning node */
class PhoenixService(
    app: ApplicationEnvironment,
    private val httpClient: HttpClient,
) {
    private data class PhoenixPaymentErrorResolution(
        val code: String,
        val statusCode: Int,
    )

    companion object {
        private val phoenixJson =
            Json {
                ignoreUnknownKeys = true
                prettyPrint = true
            }
    }

    private val config = app.config
    private val phoenixdUrl = config.property("phoenixd-url").getString()
    constructor(app: ApplicationEnvironment) : this(
        app,
        HttpClient(CIO) {
            install(Auth) {
                basic {
                    credentials {
                        BasicAuthCredentials(
                            username = "",
                            password = app.config.property("phoenixd-password").getString(),
                        )
                    }
                }
            }
            install(ContentNegotiation) {
                json(phoenixJson)
            }
        },
    )

    //region Payments

    /** Create a new Bolt11 invoice on Phoenix */
    suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/createinvoice",
                    formParameters =
                        Parameters.build {
                            append("description", request.description)
                            request.amountSat?.let { append("amountSat", it.toString()) }
                            request.externalId?.let { append("externalId", it) }
                            request.expirySeconds?.let {
                                append("expirySeconds", it.toString())
                            }
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.body<CreateInvoiceResponse>()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to create invoice on Phoenix: ${e.message}")
        }
    }

    /** Create a new Bolt12 offer on Phoenix */
    suspend fun createOffer(request: CreateOffer): String {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/createoffer",
                    formParameters =
                        Parameters.build {
                            request.description?.let { append("description", it) }
                            request.amountSat?.let { append("amountSat", it.toString()) }
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.bodyAsText()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to create offer on Phoenix: ${e.message}")
        }
    }

    /** Pay a Bolt11 invoice on Phoenix */
    suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/payinvoice",
                    formParameters =
                        Parameters.build {
                            append("invoice", request.invoice)
                            request.amountSat?.let { append("amountSat", it.toString()) }
                        },
                )
            if (response.status.value != 200) {
                throw buildPhoenixServiceException(
                    response = response,
                    fallbackMessage = "Failed to pay invoice on Phoenix",
                )
            }
            val rawBody = response.bodyAsText().trim()
            return parsePaymentResponse(rawBody)
        } catch (e: PhoenixServiceException) {
            throw e
        } catch (e: Exception) {
            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: ${e.message}",
                code = "node_unavailable",
                statusCode = 503,
                upstreamMessage = e.message,
            )
        }
    }

    /** Pay a Bolt12 offer on Phoenix */
    suspend fun payOffer(request: PayOfferRequest): PaymentResponse {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/payoffer",
                    formParameters =
                        Parameters.build {
                            append("offer", request.offer)
                            request.amountSat?.let { append("amountSat", it.toString()) }
                            request.message?.let { append("message", it) }
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }
            return response.body<PaymentResponse>()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to pay offer on Phoenix: ${e.message}")
        }
    }

    /** Pay Onchain transaction on Phoenix */
    suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/payonchain",
                    formParameters =
                        Parameters.build {
                            append("address", request.address)
                            append("amountSat", request.amountSat.toString())
                            append("feerateSatByte", request.feerateSatByte.toString())
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }
            return response.body<PaymentResponse>()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to pay onchain transaction on Phoenix: ${e.message}")
        }
    }

    /** Bump the fee of all pending onchain transactions */
    suspend fun bumpOnchainFees(feerateSatByte: Int): String {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/bumpfee",
                    formParameters =
                        Parameters.build {
                            append("feerateSatByte", feerateSatByte.toString())
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.bodyAsText()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to bump onchain fees on Phoenix: ${e.message}")
        }
    }

    /** List incoming payments from Phoenix */
    suspend fun listIncomingPayments(
        from: Long = 0,
        to: Long? = null,
        limit: Int = 20,
        offset: Int = 0,
        all: Boolean = false,
        externalId: String? = null,
    ): List<IncomingPayment> {
        try {
            val response: HttpResponse =
                httpClient.get("$phoenixdUrl/payments/incoming") {
                    parameter("from", from)
                    to?.let { parameter("to", it) }
                    parameter("limit", limit)
                    parameter("offset", offset)
                    if (all) parameter("all", "true")
                    externalId?.let { parameter("externalId", it) }
                }
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.body<List<IncomingPayment>>()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to list incoming payments on Phoenix: ${e.message}")
        }
    }

    /** Get a specific incoming payment by payment hash */
    suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
        try {
            val response: HttpResponse = httpClient.get("$phoenixdUrl/payments/incoming/$paymentHash")
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.body<IncomingPayment>()
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to get incoming payment on Phoenix: ${e.message}")
        }
    }

    /** List outgoing payments from Phoenix */
    suspend fun listOutgoingPayments(
        from: Long = 0,
        to: Long? = null,
        limit: Int = 20,
        offset: Int = 0,
        all: Boolean = false,
    ): List<OutgoingPayment> {
        try {
            val response: HttpResponse =
                httpClient.get("$phoenixdUrl/payments/outgoing") {
                    parameter("from", from)
                    to?.let { parameter("to", it) }
                    parameter("limit", limit)
                    parameter("offset", offset)
                    if (all) parameter("all", "true")
                }
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.body<List<OutgoingPayment>>().map { payment ->
                payment.copy(description = Bolt11Decoder.extractDescription(payment.invoice))
            }
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to list outgoing payments on Phoenix: ${e.message}")
        }
    }

    /** Get a specific outgoing payment by payment ID */
    suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment {
        try {
            val response: HttpResponse = httpClient.get("$phoenixdUrl/payments/outgoing/$paymentId")
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            val payment = response.body<OutgoingPayment>()
            return payment.copy(description = Bolt11Decoder.extractDescription(payment.invoice))
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to get outgoing payment on Phoenix: ${e.message}")
        }
    }

    /** Get a specific outgoing payment by payment hash */
    suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment {
        try {
            val response: HttpResponse =
                httpClient.get("$phoenixdUrl/payments/outgoingbyhash/$paymentHash")
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            val payment = response.body<OutgoingPayment>()
            return payment.copy(description = Bolt11Decoder.extractDescription(payment.invoice))
        } catch (e: Exception) {
            throw PhoenixServiceException(
                "Failed to get outgoing payment by hash on Phoenix: ${e.message}",
            )
        }
    }

    /** Export CSV data from Phoenix */
    suspend fun csvExport(request: CsvExport): String {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/export",
                    formParameters =
                        Parameters.build {
                            append("from", request.from)
                            append("to", request.to)
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return response.bodyAsText()
        } catch (e: Exception) {
            throw PhoenixServiceException(
                "Failed to export CSV from Phoenix: ${e.message}",
            )
        }
    }
    //endregion

    //region Node Management

    /** Get node information from Phoenix */
    suspend fun getNodeInfo(): NodeInfo {
        try {
            val response: HttpResponse = httpClient.get("$phoenixdUrl/getinfo")
            if (response.status.value != 200) {
                throw PhoenixNodeInfoException(
                    "Phoenix node returned status code: ${response.status.value}",
                )
            }

            return response.body<NodeInfo>()
        } catch (e: PhoenixNodeInfoException) {
            throw e
        } catch (e: Exception) {
            throw PhoenixConnectionException("Failed to connect to Phoenix node: ${e.message}")
        }
    }

    /** Get balance information from Phoenix */
    suspend fun getBalance(): PhoenixBalance {
        try {
            val response: HttpResponse = httpClient.get("$phoenixdUrl/getbalance")
            if (response.status.value != 200) {
                throw PhoenixBalanceException("Phoenix node returned status code: ${response.status.value}")
            }

            return response.body<PhoenixBalance>()
        } catch (e: PhoenixBalanceException) {
            throw e
        } catch (e: Exception) {
            throw PhoenixConnectionException("Failed to connect to Phoenix node: ${e.message}")
        }
    }

    /** Close a channel and send funds to an on-chain address */
    suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse {
        try {
            val response: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/closechannel",
                    formParameters =
                        Parameters.build {
                            append("channelId", request.channelId)
                            append("address", request.address)
                            append("feerateSatByte", request.feerateSatByte.toString())
                        },
                )
            if (response.status.value != 200) {
                throw PhoenixServiceException("Phoenix node returned ${response.status.value}")
            }

            return CloseChannelResponse(txId = response.bodyAsText().trim())
        } catch (e: Exception) {
            throw PhoenixServiceException("Failed to close channel on Phoenix: ${e.message}")
        }
    }
    //endregion

    private suspend fun buildPhoenixServiceException(
        response: HttpResponse,
        fallbackMessage: String,
    ): PhoenixServiceException {
        val rawBody = response.bodyAsText().trim()
        val message =
            extractPhoenixErrorMessage(rawBody)
                ?: "$fallbackMessage: Phoenix node returned ${response.status.value}"
        val errorResolution = resolvePhoenixPaymentError(message)

        return PhoenixServiceException(
            message = message,
            code = errorResolution.code,
            statusCode = errorResolution.statusCode,
            upstreamMessage = rawBody.ifBlank { null },
        )
    }

    private fun extractPhoenixErrorMessage(rawBody: String): String? {
        if (rawBody.isBlank()) return null

        return try {
            phoenixJson
                .parseToJsonElement(rawBody)
                .jsonObject["message"]
                ?.jsonPrimitive
                ?.contentOrNull
                ?: rawBody
        } catch (_: Exception) {
            rawBody
        }
    }

    private fun parsePaymentResponse(rawBody: String): PaymentResponse {
        if (rawBody.isBlank()) {
            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: Empty response body",
                code = "unknown",
                statusCode = 502,
            )
        }

        return try {
            phoenixJson.decodeFromString<PaymentResponse>(rawBody)
        } catch (_: Exception) {
            val message = extractPhoenixErrorMessage(rawBody)
            if (message != null) {
                val errorResolution = resolvePhoenixPaymentError(message)
                throw PhoenixServiceException(
                    message = message,
                    code = errorResolution.code,
                    statusCode = errorResolution.statusCode,
                    upstreamMessage = rawBody,
                )
            }

            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: Invalid payment response",
                code = "unknown",
                statusCode = 502,
                upstreamMessage = rawBody,
            )
        }
    }

    private fun resolvePhoenixPaymentError(message: String): PhoenixPaymentErrorResolution {
        val normalizedMessage = message.lowercase()

        return when {
            "already paid" in normalizedMessage || "already been paid" in normalizedMessage -> {
                PhoenixPaymentErrorResolution(
                    code = "invoice_already_paid",
                    statusCode = 409,
                )
            }

            "expired" in normalizedMessage && "invoice" in normalizedMessage -> {
                PhoenixPaymentErrorResolution(
                    code = "invoice_expired",
                    statusCode = 410,
                )
            }

            "recipient node rejected the payment" in normalizedMessage -> {
                PhoenixPaymentErrorResolution(
                    code = "recipient_rejected_payment",
                    statusCode = 422,
                )
            }

            "invalid" in normalizedMessage && ("invoice" in normalizedMessage || "bolt11" in normalizedMessage) -> {
                PhoenixPaymentErrorResolution(
                    code = "invalid_invoice",
                    statusCode = 400,
                )
            }

            ("insufficient" in normalizedMessage || "not enough" in normalizedMessage) &&
                ("fund" in normalizedMessage || "balance" in normalizedMessage || "liquidity" in normalizedMessage) -> {
                PhoenixPaymentErrorResolution(
                    code = "insufficient_funds",
                    statusCode = 402,
                )
            }

            "timeout" in normalizedMessage || "unavailable" in normalizedMessage || "connection" in normalizedMessage -> {
                PhoenixPaymentErrorResolution(
                    code = "node_unavailable",
                    statusCode = 503,
                )
            }

            else -> {
                PhoenixPaymentErrorResolution(
                    code = "unknown",
                    statusCode = 502,
                )
            }
        }
    }

    /** Get seed from Phoenix */
    suspend fun getSeed(): String = AppConfig.loadPhoenixSeed()
}
