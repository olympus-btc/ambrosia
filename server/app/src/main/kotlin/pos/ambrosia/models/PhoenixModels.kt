package pos.ambrosia.models.Phoenix

import kotlinx.serialization.Serializable

@Serializable data class PhoenixBalance(val balanceSat: Long, val feeCreditSat: Long)

@Serializable
data class NodeInfo(
	val nodeId: String,
	val channels: List<Channel>,
	val chain: String,
	val blockHeight: Int?,
	val version: String
)

@Serializable
data class Channel(
	val state: String,
	val channelId: String,
	val balanceSat: Long,
	val inboundLiquiditySat: Long,
	val capacitySat: Long,
	val fundingTxId: String
)

@Serializable
data class CreateInvoiceRequest(
	val description: String,
	val amountSat: Long? = null,
	val externalId: String? = null,
	val expirySeconds: Long? = null
)

@Serializable
data class CreateInvoiceResponse(
	val amountSat: Long?,
	val paymentHash: String,
	val serialized: String
)

@Serializable data class PayInvoiceRequest(val amountSat: Long? = null, val invoice: String)

@Serializable
data class PaymentResponse(
	val recipientAmountSat: Long,
	val routingFeeSat: Long,
	val paymentId: String,
	val paymentHash: String,
	val paymentPreimage: String
)

@Serializable
data class IncomingPayment(
	val type: String,
	val subType: String,
	val paymentHash: String,
	val preimage: String? = null,
	val externalId: String? = null,
	val description: String? = null,
	val invoice: String? = null,
	val isPaid: Boolean,
	val isExpired: Boolean? = null,
	val requestedSat: Long? = null,
	val receivedSat: Long,
	val fees: Long,
	val payerKey: String? = null,
	val expiresAt: Long? = null,
	val completedAt: Long? = null,
	val createdAt: Long
)

@Serializable
data class OutgoingPayment(
	val type: String,
	val subType: String,
	val paymentId: String,
	val paymentHash: String? = null,
	val txId: String? = null,
	val preimage: String? = null,
	val isPaid: Boolean,
	val sent: Long,
	val fees: Long,
	val invoice: String? = null,
	val completedAt: Long? = null,
	val createdAt: Long
)

@Serializable data class CreateOffer(val description: String? = null, val amountSat: Long? = null)

@Serializable
data class PayOfferRequest(
	val amountSat: Long? = null,
	val offer: String,
	val message: String? = null
)

@Serializable
data class PayOnchainRequest(val amountSat: Long, val address: String, val feerateSatByte: Long)

@Serializable
data class CloseChannelRequest(val channelId: String, val address: String, val feerateSatByte: Long)