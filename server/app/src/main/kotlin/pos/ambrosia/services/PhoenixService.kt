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
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import pos.ambrosia.config.AppConfig
import pos.ambrosia.logger
import pos.ambrosia.models.phoenix.Channel
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
import pos.ambrosia.utils.PhoenixChannelNotAvailableException
import pos.ambrosia.utils.PhoenixConnectionException
import pos.ambrosia.utils.PhoenixNodeInfoException
import pos.ambrosia.utils.PhoenixServiceException
import java.time.Instant

interface PaymentVerifier {
    suspend fun getIncomingPayment(paymentHash: String): IncomingPayment
}

class PhoenixService(
    private val phoenixdUrl: String,
    private val httpClient: HttpClient,
) : PaymentVerifier,
    LightningBackend {
    private data class PhoenixPaymentErrorDetails(
        val displayMessage: String,
        val phoenixReason: String?,
        val paymentHash: String?,
        val rawBody: String?,
    )

    companion object {
        private val phoenixJson =
            Json {
                ignoreUnknownKeys = true
                prettyPrint = true
            }

        private fun buildHttpClient(phoenixdPassword: String): HttpClient =
            HttpClient(CIO) {
                install(Auth) {
                    basic {
                        credentials {
                            BasicAuthCredentials(username = "", password = phoenixdPassword)
                        }
                    }
                }
                install(ContentNegotiation) {
                    json(phoenixJson)
                }
            }

        suspend fun testCandidateNodeConnection(
            candidateUrl: String,
            candidatePassword: String,
        ): NodeInfo {
            val candidateService = PhoenixService(candidateUrl, candidatePassword)
            try {
                return candidateService.getNodeInfo()
            } finally {
                candidateService.close()
            }
        }
    }

    private val ambrosiaVersion =
        PhoenixService::class.java.`package`?.implementationVersion ?: "dev"

    constructor(app: ApplicationEnvironment, httpClient: HttpClient) : this(
        app.config.property("phoenixd-url").getString(),
        httpClient,
    )

    constructor(phoenixdUrl: String, phoenixdPassword: String) : this(phoenixdUrl, buildHttpClient(phoenixdPassword))

    override fun close() {
        httpClient.close()
    }

    //region Payments

    /** Create a new Bolt11 invoice on Phoenix */
    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse {
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
    override suspend fun createOffer(request: CreateOffer): String {
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
    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
        val paymentAttemptStartedAt = System.currentTimeMillis()
        val decodedPaymentHash = Bolt11Decoder.extractPaymentHash(request.invoice)

        try {
            val phoenixPayInvoiceResponse: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/payinvoice",
                    formParameters =
                        Parameters.build {
                            append("invoice", request.invoice)
                            request.amountSat?.let { append("amountSat", it.toString()) }
                        },
                )
            if (phoenixPayInvoiceResponse.status.value != 200) {
                throw buildPhoenixServiceException(
                    phoenixPayInvoiceResponse = phoenixPayInvoiceResponse,
                    fallbackMessage = "Failed to pay invoice on Phoenix",
                    decodedPaymentHash = decodedPaymentHash,
                    requestedAmountSats = request.amountSat,
                    amountSatSent = request.amountSat != null,
                    requestDurationMs = elapsedMilliseconds(paymentAttemptStartedAt),
                )
            }
            val phoenixResponseBody = phoenixPayInvoiceResponse.bodyAsText().trim()
            val paymentResponse =
                try {
                    parsePaymentResponse(phoenixResponseBody)
                } catch (paymentResponseException: PhoenixServiceException) {
                    logOutgoingPaymentDiagnostic(
                        paymentHash = decodedPaymentHash,
                        requestedAmountSats = request.amountSat,
                        amountSatSent = request.amountSat != null,
                        phoenixdHttpStatus = phoenixPayInvoiceResponse.status.value,
                        phoenixdReason = paymentResponseException.upstreamMessage ?: paymentResponseException.message,
                        requestDurationMs = elapsedMilliseconds(paymentAttemptStartedAt),
                        finalErrorCategory = paymentResponseException.category,
                    )
                    throw paymentResponseException.withDiagnosticLogged()
                }
            logOutgoingPaymentDiagnostic(
                paymentHash = paymentResponse.paymentHash.takeIf { it.isNotBlank() } ?: decodedPaymentHash,
                requestedAmountSats = request.amountSat,
                amountSatSent = request.amountSat != null,
                phoenixdHttpStatus = phoenixPayInvoiceResponse.status.value,
                phoenixdReason = null,
                requestDurationMs = elapsedMilliseconds(paymentAttemptStartedAt),
                finalErrorCategory = null,
            )
            return paymentResponse
        } catch (phoenixServiceException: PhoenixServiceException) {
            if (!phoenixServiceException.diagnosticLogged) {
                logOutgoingPaymentDiagnostic(
                    paymentHash = decodedPaymentHash,
                    requestedAmountSats = request.amountSat,
                    amountSatSent = request.amountSat != null,
                    phoenixdHttpStatus = phoenixServiceException.statusCode,
                    phoenixdReason = phoenixServiceException.upstreamMessage ?: phoenixServiceException.message,
                    requestDurationMs = elapsedMilliseconds(paymentAttemptStartedAt),
                    finalErrorCategory = phoenixServiceException.category,
                )
            }
            throw phoenixServiceException
        } catch (paymentException: Exception) {
            val failureClassification =
                OutgoingPaymentFailureClassifier.classify(paymentException.message.orEmpty())
            logOutgoingPaymentDiagnostic(
                paymentHash = decodedPaymentHash,
                requestedAmountSats = request.amountSat,
                amountSatSent = request.amountSat != null,
                phoenixdHttpStatus = null,
                phoenixdReason = paymentException.message,
                requestDurationMs = elapsedMilliseconds(paymentAttemptStartedAt),
                finalErrorCategory = failureClassification.category,
            )
            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: ${paymentException.message}",
                code = "node_unavailable",
                category = failureClassification.category,
                statusCode = 503,
                upstreamMessage = paymentException.message,
            )
        }
    }

    /** Pay a Bolt12 offer on Phoenix */
    override suspend fun payOffer(request: PayOfferRequest): PaymentResponse {
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
    override suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse {
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
    override suspend fun bumpOnchainFees(feerateSatByte: Int): String {
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
    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
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

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
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
    override suspend fun listOutgoingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
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
    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment {
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
    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment {
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
    override suspend fun csvExport(request: CsvExport): String {
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
    override suspend fun getNodeInfo(): NodeInfo {
        try {
            val getInfoHttpResponse: HttpResponse = httpClient.get("$phoenixdUrl/getinfo")
            if (getInfoHttpResponse.status.value != 200) {
                throw PhoenixNodeInfoException(
                    "Phoenix node returned status code: ${getInfoHttpResponse.status.value}",
                )
            }

            val nodeInfo = getInfoHttpResponse.body<NodeInfo>()
            val normalizedChannels = nodeInfo.channels.map { it.withNormalizedState() }
            return nodeInfo.copy(channels = resolveMissingChannelId(normalizedChannels))
        } catch (phoenixNodeInfoException: PhoenixNodeInfoException) {
            throw phoenixNodeInfoException
        } catch (nodeInfoRequestException: Exception) {
            throw PhoenixConnectionException(
                "Failed to connect to Phoenix node: ${nodeInfoRequestException.message}",
            )
        }
    }

    /** Get balance information from Phoenix */
    override suspend fun getBalance(): PhoenixBalance {
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
    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse {
        try {
            val closeChannelHttpResponse: HttpResponse =
                httpClient.submitForm(
                    url = "$phoenixdUrl/closechannel",
                    formParameters =
                        Parameters.build {
                            append("channelId", request.channelId)
                            append("address", request.address)
                            append("feerateSatByte", request.feerateSatByte.toString())
                        },
                )
            if (closeChannelHttpResponse.status.value != 200) {
                val errorBody = closeChannelHttpResponse.bodyAsText()
                throw PhoenixServiceException(
                    "Phoenix node returned ${closeChannelHttpResponse.status.value}: $errorBody",
                )
            }

            val txId = closeChannelHttpResponse.bodyAsText().trim()
            if (txId.contains("no channel available")) {
                throw PhoenixChannelNotAvailableException()
            }

            return CloseChannelResponse(txId = txId)
        } catch (channelNotAvailableException: PhoenixChannelNotAvailableException) {
            throw channelNotAvailableException
        } catch (phoenixServiceException: PhoenixServiceException) {
            throw phoenixServiceException
        } catch (closeChannelRequestException: Exception) {
            throw PhoenixServiceException(
                "Failed to close channel on Phoenix: ${closeChannelRequestException.message}",
            )
        }
    }
    //endregion

    private suspend fun buildPhoenixServiceException(
        phoenixPayInvoiceResponse: HttpResponse,
        fallbackMessage: String,
        decodedPaymentHash: String?,
        requestedAmountSats: Long?,
        amountSatSent: Boolean,
        requestDurationMs: Long,
    ): PhoenixServiceException {
        val phoenixResponseBody = phoenixPayInvoiceResponse.bodyAsText().trim()
        val paymentErrorDetails =
            extractPhoenixPaymentErrorDetails(phoenixResponseBody)
                ?: PhoenixPaymentErrorDetails(
                    displayMessage = "$fallbackMessage: Phoenix node returned ${phoenixPayInvoiceResponse.status.value}",
                    phoenixReason = null,
                    paymentHash = decodedPaymentHash,
                    rawBody = phoenixResponseBody.ifBlank { null },
                )
        val failureClassification =
            OutgoingPaymentFailureClassifier.classify(paymentErrorDetails.displayMessage)

        logOutgoingPaymentDiagnostic(
            paymentHash = paymentErrorDetails.paymentHash ?: decodedPaymentHash,
            requestedAmountSats = requestedAmountSats,
            amountSatSent = amountSatSent,
            phoenixdHttpStatus = phoenixPayInvoiceResponse.status.value,
            phoenixdReason = paymentErrorDetails.phoenixReason,
            requestDurationMs = requestDurationMs,
            finalErrorCategory = failureClassification.category,
        )

        return PhoenixServiceException(
            message = paymentErrorDetails.displayMessage,
            code = failureClassification.code,
            category = failureClassification.category,
            statusCode = failureClassification.statusCode,
            upstreamMessage = paymentErrorDetails.rawBody,
            diagnosticLogged = true,
        )
    }

    private fun extractPhoenixPaymentErrorDetails(rawBody: String): PhoenixPaymentErrorDetails? {
        if (rawBody.isBlank()) return null

        return try {
            val errorObject = phoenixJson.parseToJsonElement(rawBody).jsonObject
            val phoenixReason =
                errorObject["reason"]?.jsonPrimitive?.contentOrNull
            val displayMessage =
                errorObject["message"]?.jsonPrimitive?.contentOrNull
                    ?: phoenixReason
                    ?: rawBody
            PhoenixPaymentErrorDetails(
                displayMessage = displayMessage,
                phoenixReason = phoenixReason,
                paymentHash = errorObject["paymentHash"]?.jsonPrimitive?.contentOrNull,
                rawBody = rawBody,
            )
        } catch (parseException: Exception) {
            PhoenixPaymentErrorDetails(
                displayMessage = rawBody,
                phoenixReason = rawBody,
                paymentHash = null,
                rawBody = rawBody,
            )
        }
    }

    private fun parsePaymentResponse(rawBody: String): PaymentResponse {
        if (rawBody.isBlank()) {
            val failureClassification =
                OutgoingPaymentFailureClassifier.classify("Failed to pay invoice on Phoenix: Empty response body")
            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: Empty response body",
                code = failureClassification.code,
                category = failureClassification.category,
                statusCode = failureClassification.statusCode,
            )
        }

        return try {
            phoenixJson.decodeFromString<PaymentResponse>(rawBody)
        } catch (parseException: Exception) {
            val paymentErrorDetails = extractPhoenixPaymentErrorDetails(rawBody)
            if (paymentErrorDetails != null) {
                val failureClassification =
                    OutgoingPaymentFailureClassifier.classify(paymentErrorDetails.displayMessage)
                throw PhoenixServiceException(
                    message = paymentErrorDetails.displayMessage,
                    code = failureClassification.code,
                    category = failureClassification.category,
                    statusCode = failureClassification.statusCode,
                    upstreamMessage = paymentErrorDetails.rawBody,
                )
            }

            val failureClassification =
                OutgoingPaymentFailureClassifier.classify("Failed to pay invoice on Phoenix: Invalid payment response")
            throw PhoenixServiceException(
                message = "Failed to pay invoice on Phoenix: Invalid payment response",
                code = failureClassification.code,
                category = failureClassification.category,
                statusCode = failureClassification.statusCode,
                upstreamMessage = rawBody,
            )
        }
    }

    private fun logOutgoingPaymentDiagnostic(
        paymentHash: String?,
        requestedAmountSats: Long?,
        amountSatSent: Boolean,
        phoenixdHttpStatus: Int?,
        phoenixdReason: String?,
        requestDurationMs: Long,
        finalErrorCategory: String?,
    ) {
        val diagnosticPayload =
            buildJsonObject {
                put("timestamp", Instant.now().toString())
                putNullable("paymentHash", paymentHash)
                putNullable("requestedAmountSats", requestedAmountSats)
                put("amountSatSent", amountSatSent)
                put("lightningBackendType", "phoenixd")
                put("ambrosiaVersion", ambrosiaVersion)
                put("phoenixdVersion", JsonNull)
                putNullable("phoenixdHttpStatus", phoenixdHttpStatus)
                putNullable("phoenixdReason", phoenixdReason)
                put("requestDurationMs", requestDurationMs)
                putNullable("finalErrorCategory", finalErrorCategory)
            }

        logger.info("Outgoing Lightning payment diagnostic: $diagnosticPayload")
    }

    private fun Channel.withNormalizedState(): Channel = copy(state = state.substringBefore('('))

    private suspend fun resolveMissingChannelId(channels: List<Channel>): List<Channel> {
        val channelsMissingChannelId = channels.filter { it.channelId == null }
        if (channelsMissingChannelId.isEmpty()) return channels

        val knownChannelIds = channels.mapNotNull { it.channelId }.toSet()
        val unassignedChannelIds =
            try {
                fetchChannelIdsFromListChannels().filterNot { it in knownChannelIds }
            } catch (listChannelsException: Exception) {
                logger.warn("Failed to resolve channel IDs from /listchannels: ${listChannelsException.message}")
                return channels
            }

        if (channelsMissingChannelId.size != 1 || unassignedChannelIds.size != 1) {
            logger.warn(
                "Cannot safely resolve channel IDs from /listchannels: " +
                    "${channelsMissingChannelId.size} channel(s) missing an ID, " +
                    "${unassignedChannelIds.size} unassigned ID(s) found",
            )
            return channels
        }

        val resolvedChannelId = unassignedChannelIds.single()
        return channels.map { channel ->
            if (channel.channelId == null) channel.copy(channelId = resolvedChannelId) else channel
        }
    }

    private suspend fun fetchChannelIdsFromListChannels(): List<String> {
        val listChannelsHttpResponse = httpClient.get("$phoenixdUrl/listchannels")
        if (listChannelsHttpResponse.status.value != 200) {
            throw PhoenixServiceException("Phoenix node returned ${listChannelsHttpResponse.status.value}")
        }

        val listChannelsJson = phoenixJson.parseToJsonElement(listChannelsHttpResponse.bodyAsText()).jsonArray
        return listChannelsJson.mapNotNull { channelElement -> channelElement.extractChannelIdOrNull() }
    }

    private fun JsonElement.extractChannelIdOrNull(): String? =
        try {
            val channelObject = jsonObject
            val commitments =
                channelObject["commitments"]?.jsonObject
                    ?: channelObject["state"]?.jsonObject?.get("commitments")?.jsonObject
            commitments
                ?.get("channelParams")
                ?.jsonObject
                ?.get("channelId")
                ?.jsonPrimitive
                ?.contentOrNull
        } catch (unexpectedChannelShapeException: Exception) {
            null
        }

    private fun elapsedMilliseconds(startedAtMillis: Long): Long = System.currentTimeMillis() - startedAtMillis

    private fun PhoenixServiceException.withDiagnosticLogged(): PhoenixServiceException =
        PhoenixServiceException(
            message = message ?: "Phoenix Lightning node service error",
            code = code,
            category = category,
            statusCode = statusCode,
            source = source,
            upstreamMessage = upstreamMessage,
            diagnosticLogged = true,
        )

    private fun JsonObjectBuilder.putNullable(
        key: String,
        value: String?,
    ) {
        if (value == null) {
            put(key, JsonNull)
        } else {
            put(key, value)
        }
    }

    private fun JsonObjectBuilder.putNullable(
        key: String,
        value: Long?,
    ) {
        if (value == null) {
            put(key, JsonNull)
        } else {
            put(key, value)
        }
    }

    private fun JsonObjectBuilder.putNullable(
        key: String,
        value: Int?,
    ) {
        if (value == null) {
            put(key, JsonNull)
        } else {
            put(key, value)
        }
    }

    /** Get seed from Phoenix */
    override suspend fun getSeed(): String = AppConfig.loadPhoenixSeed()
}
