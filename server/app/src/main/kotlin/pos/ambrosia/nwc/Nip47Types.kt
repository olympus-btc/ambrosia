package pos.ambrosia.nwc

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

// NIP-47 request sent from client to wallet service
@Serializable
data class Nip47Request(
  val method: String,
  val params: JsonObject
)

// NIP-47 response from wallet service to client
@Serializable
data class Nip47Response(
  @SerialName("result_type")
  val resultType: String? = null,
  val error: Nip47Error? = null,
  val result: JsonObject? = null
)

@Serializable
data class Nip47Error(
  val code: String,
  val message: String
)

// NIP-47 make_invoice result
@Serializable
data class Nip47Transaction(
  val type: String? = null,
  val invoice: String? = null,
  val description: String? = null,
  @SerialName("description_hash")
  val descriptionHash: String? = null,
  val preimage: String? = null,
  @SerialName("payment_hash")
  val paymentHash: String? = null,
  val amount: Long? = null,
  @SerialName("fees_paid")
  val feesPaid: Long? = null,
  @SerialName("created_at")
  val createdAt: Long? = null,
  @SerialName("expires_at")
  val expiresAt: Long? = null,
  @SerialName("settled_at")
  val settledAt: Long? = null,
  val metadata: JsonObject? = null
)

// NIP-47 get_balance result
@Serializable
data class Nip47Balance(
  val balance: Long  // in millisats
)

// NIP-47 get_info result
@Serializable
data class Nip47Info(
  val alias: String? = null,
  val color: String? = null,
  val pubkey: String? = null,
  val network: String? = null,
  @SerialName("block_height")
  val blockHeight: Int? = null,
  @SerialName("block_hash")
  val blockHash: String? = null,
  val methods: List<String>? = null
)

// NIP-47 pay_invoice result
@Serializable
data class Nip47PayResult(
  val preimage: String? = null,
  @SerialName("fees_paid")
  val feesPaid: Long? = null
)
