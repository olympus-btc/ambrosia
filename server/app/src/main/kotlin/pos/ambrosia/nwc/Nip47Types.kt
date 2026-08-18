package pos.ambrosia.nwc

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class Nip47Request(
    val method: String,
    val params: JsonObject,
)

@Serializable
data class Nip47Response(
    @SerialName("result_type")
    val resultType: String? = null,
    val error: Nip47Error? = null,
    val result: JsonObject? = null,
)

@Serializable
data class Nip47Error(
    val code: String,
    val message: String,
)

@Serializable
data class Nip47Transaction(
    val type: String? = null,
    val invoice: String? = null,
    val description: String? = null,
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
)

@Serializable
data class Nip47Balance(
    @SerialName("balance")
    val balanceMsat: Long,
)

@Serializable
data class Nip47Info(
    val pubkey: String? = null,
    val network: String? = null,
    @SerialName("block_height")
    val blockHeight: Int? = null,
)

@Serializable
data class Nip47PayResult(
    val preimage: String? = null,
    @SerialName("fees_paid")
    val feesPaid: Long? = null,
)
