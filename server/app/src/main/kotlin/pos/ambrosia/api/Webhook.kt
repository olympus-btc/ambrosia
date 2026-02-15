package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlinx.serialization.json.Json
import pos.ambrosia.config.AppConfig
import pos.ambrosia.logger

private const val SIGNATURE_HEADER = "X-Phoenix-Signature"
private val json = Json { ignoreUnknownKeys = true }

fun Application.configurePhoenixWebhook() {
  routing { phoenixWebhook() }
}

fun Route.phoenixWebhook() {
  post("/webhook/phoenixd") {
    val secret = call.application.getPhoenixWebhookSecret()
    if (secret.isNullOrBlank()) {
      logger.error("Phoenix webhook-secret not configured in phoenix.conf or application config")
      call.respond(
        HttpStatusCode.InternalServerError,
        "Missing phoenix webhook-secret; set webhook-secret in phoenix.conf"
      )
      return@post
    }

    val providedSignature = call.request.headers[SIGNATURE_HEADER]
    if (providedSignature.isNullOrBlank()) {
      call.respond(HttpStatusCode.Unauthorized, "Missing $SIGNATURE_HEADER header")
      return@post
    }

    val rawBody = call.receiveText()
    val expectedSignature = calculatePhoenixSignature(rawBody, secret)
    if (!signaturesMatch(expectedSignature, providedSignature)) {
      logger.warn("Phoenix webhook signature mismatch for payment body hash")
      call.respond(HttpStatusCode.Unauthorized, "Invalid signature")
      return@post
    }

    val payload =
      runCatching { json.decodeFromString<PaymentNotification>(rawBody) }
        .getOrElse {
          logger.warn("Invalid Phoenix webhook payload: ${it.message}")
          call.respond(HttpStatusCode.BadRequest, "Invalid payload")
          return@post
        }

    logger.info(
      "Phoenix webhook received: type=${payload.type}, paymentHash=${payload.paymentHash}, amountSat=${payload.amountSat}, externalId=${payload.externalId}"
    )

    PaymentNotifier.broadcast(payload)

    call.respond(HttpStatusCode.Accepted, mapOf("status" to "ok"))
  }
}

internal fun calculatePhoenixSignature(body: String, secret: String): String {
  val mac = Mac.getInstance("HmacSHA256")
  val keySpec = SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256")
  mac.init(keySpec)
  val result = mac.doFinal(body.toByteArray(Charsets.UTF_8))
  return result.joinToString("") { "%02x".format(it) }
}

internal fun signaturesMatch(expected: String, provided: String): Boolean {
  val expectedBytes = hexToBytes(expected) ?: return false
  val providedBytes = hexToBytes(provided) ?: return false
  return MessageDigest.isEqual(expectedBytes, providedBytes)
}

private fun hexToBytes(hex: String): ByteArray? {
  if (hex.length % 2 != 0) return null
  return try {
    hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
  } catch (e: NumberFormatException) {
    null
  }
}

private fun Application.getPhoenixWebhookSecret(): String? {
  return environment.config.propertyOrNull("phoenix.webhook-secret")?.getString()
    ?: AppConfig.getPhoenixProperty("webhook-secret")
}
