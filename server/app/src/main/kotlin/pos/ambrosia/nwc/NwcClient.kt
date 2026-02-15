package pos.ambrosia.nwc

import app.cash.nostrino.crypto.CipherText
import app.cash.nostrino.crypto.PubKey
import app.cash.nostrino.crypto.SecKey
import io.ktor.client.*
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import okio.ByteString.Companion.decodeHex
import pos.ambrosia.logger
import pos.ambrosia.utils.NwcConnectionException
import pos.ambrosia.utils.NwcServiceException
import java.util.concurrent.ConcurrentHashMap

private const val NWC_REQUEST_KIND = 23194
private const val NWC_RESPONSE_KIND = 23195
private const val REQUEST_TIMEOUT_MS = 30_000L

class NwcClient(
  private val connectionInfo: NwcConnectionInfo,
  private val httpClient: HttpClient
) {
  private val clientSecKey = SecKey(connectionInfo.secretHex.decodeHex())
  private val clientPubkeyHex = clientSecKey.pubKey.key.hex()
  private val walletPubKey = PubKey(connectionInfo.walletPubkeyHex.decodeHex())
  private val relay = NostrRelay(connectionInfo.relayUrl, httpClient)
  private val pendingRequests = ConcurrentHashMap<String, CompletableDeferred<Nip47Response>>()

  suspend fun connect(scope: CoroutineScope) {
    relay.connect(scope)

    // Subscribe for NIP-47 response events directed at us
    val subId = "nwc-${System.currentTimeMillis()}"
    val filter = buildJsonObject {
      put("kinds", buildJsonArray { add(NWC_RESPONSE_KIND) })
      put("#p", buildJsonArray { add(clientPubkeyHex) })
    }
    relay.subscribe(subId, filter)

    // Process incoming relay messages
    scope.launch {
      relay.messages.collect { message -> handleRelayMessage(message) }
    }

    logger.info("NWC client connected, subscribed for responses with sub={}", subId)
  }

  private fun handleRelayMessage(raw: String) {
    try {
      val arr = Json.parseToJsonElement(raw).jsonArray
      val type = arr[0].jsonPrimitive.content
      if (type == "EVENT" && arr.size >= 3) {
        val eventJson = arr[2].jsonObject
        val event = NostrEvent.fromJson(eventJson.toString())
        if (event.kind == NWC_RESPONSE_KIND) {
          handleResponseEvent(event)
        }
      }
    } catch (e: Exception) {
      logger.debug("Ignoring unparseable relay message: {}", e.message)
    }
  }

  private fun handleResponseEvent(event: NostrEvent) {
    try {
      // Find the 'e' tag that references the request event ID
      val requestId = event.tags.find { it.firstOrNull() == "e" }?.getOrNull(1)
      if (requestId == null) {
        logger.debug("NWC response event missing 'e' tag, ignoring")
        return
      }

      // Decrypt the NIP-04 encrypted content
      val cipherText = CipherText.parse(event.content)
      val plaintext = cipherText.decipher(walletPubKey, clientSecKey)
      val response = Json.decodeFromString<Nip47Response>(plaintext)

      // Route to pending request
      val deferred = pendingRequests.remove(requestId)
      if (deferred != null) {
        deferred.complete(response)
      } else {
        logger.debug("Received NWC response for unknown request: {}", requestId)
      }
    } catch (e: Exception) {
      logger.warn("Failed to process NWC response event: {}", e.message)
    }
  }

  private suspend fun sendRequest(method: String, params: JsonObject): Nip47Response {
    val requestJson = Json.encodeToString(Nip47Request.serializer(), Nip47Request(method, params))

    // NIP-04 encrypt the request
    val encrypted = clientSecKey.encrypt(walletPubKey, requestJson)

    // Create and sign the NWC request event (kind 23194)
    val event = createSignedEvent(
      secKey = clientSecKey,
      kind = NWC_REQUEST_KIND,
      content = encrypted.toString(),
      tags = listOf(listOf("p", connectionInfo.walletPubkeyHex))
    )

    val deferred = CompletableDeferred<Nip47Response>()
    pendingRequests[event.id] = deferred

    try {
      relay.sendEvent(event)
    } catch (e: Exception) {
      pendingRequests.remove(event.id)
      throw NwcConnectionException("Failed to send NWC request: ${e.message}")
    }

    return try {
      withTimeout(REQUEST_TIMEOUT_MS) { deferred.await() }
    } catch (e: TimeoutCancellationException) {
      pendingRequests.remove(event.id)
      throw NwcServiceException("NWC request '$method' timed out after ${REQUEST_TIMEOUT_MS}ms")
    }
  }

  private fun checkError(response: Nip47Response, method: String) {
    response.error?.let {
      throw NwcServiceException("NWC $method failed: [${it.code}] ${it.message}")
    }
  }

  suspend fun makeInvoice(
    amountMsat: Long,
    description: String = "",
    expiry: Long? = null
  ): Nip47Transaction {
    val params = buildJsonObject {
      put("amount", amountMsat)
      if (description.isNotEmpty()) put("description", description)
      expiry?.let { put("expiry", it) }
    }
    val response = sendRequest("make_invoice", params)
    checkError(response, "make_invoice")
    val result = response.result ?: throw NwcServiceException("NWC make_invoice returned no result")
    return Json.decodeFromJsonElement(result)
  }

  suspend fun payInvoice(invoice: String, amountMsat: Long? = null): Nip47PayResult {
    val params = buildJsonObject {
      put("invoice", invoice)
      amountMsat?.let { put("amount", it) }
    }
    val response = sendRequest("pay_invoice", params)
    checkError(response, "pay_invoice")
    val result = response.result ?: throw NwcServiceException("NWC pay_invoice returned no result")
    return Json.decodeFromJsonElement(result)
  }

  suspend fun getBalance(): Nip47Balance {
    val response = sendRequest("get_balance", buildJsonObject {})
    checkError(response, "get_balance")
    val result = response.result ?: throw NwcServiceException("NWC get_balance returned no result")
    return Json.decodeFromJsonElement(result)
  }

  suspend fun getInfo(): Nip47Info {
    val response = sendRequest("get_info", buildJsonObject {})
    checkError(response, "get_info")
    val result = response.result ?: throw NwcServiceException("NWC get_info returned no result")
    return Json.decodeFromJsonElement(result)
  }

  suspend fun lookupInvoice(
    paymentHash: String? = null,
    invoice: String? = null
  ): Nip47Transaction {
    val params = buildJsonObject {
      paymentHash?.let { put("payment_hash", it) }
      invoice?.let { put("invoice", it) }
    }
    val response = sendRequest("lookup_invoice", params)
    checkError(response, "lookup_invoice")
    val result = response.result ?: throw NwcServiceException("NWC lookup_invoice returned no result")
    return Json.decodeFromJsonElement(result)
  }

  suspend fun listTransactions(
    from: Long? = null,
    until: Long? = null,
    limit: Int? = null,
    offset: Int? = null,
    unpaid: Boolean? = null,
    type: String? = null
  ): List<Nip47Transaction> {
    val params = buildJsonObject {
      from?.let { put("from", it) }
      until?.let { put("until", it) }
      limit?.let { put("limit", it) }
      offset?.let { put("offset", it) }
      unpaid?.let { put("unpaid", it) }
      type?.let { put("type", it) }
    }
    val response = sendRequest("list_transactions", params)
    checkError(response, "list_transactions")
    val result = response.result ?: throw NwcServiceException("NWC list_transactions returned no result")
    val transactions = result["transactions"]?.jsonArray
      ?: throw NwcServiceException("NWC list_transactions missing 'transactions' field")
    return transactions.map { Json.decodeFromJsonElement(it) }
  }

  fun close() {
    relay.close()
  }
}
