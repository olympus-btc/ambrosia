package pos.ambrosia.services

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.api.PaymentNotification
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.AdminNotificationCategories
import pos.ambrosia.models.AdminNotificationEvent
import pos.ambrosia.models.AdminNotificationStatuses
import pos.ambrosia.models.WalletAdminNotificationTypes
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CloseChannelResponse
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.models.phoenix.PayOnchainRequest
import pos.ambrosia.models.phoenix.PaymentResponse
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.PhoenixServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import java.util.UUID

class WalletAdminNotificationService(
    private val adminNotificationService: AdminNotificationService = AdminNotificationService(),
) {
    fun notifyInvoicePaymentSent(
        actorUserId: String?,
        invoicePaymentRequest: PayInvoiceRequest,
        invoicePaymentResponse: PaymentResponse,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.PAYMENT_SENT,
                title = "Wallet payment sent",
                body = walletActorLabel(notificationActor) + " sent ${invoicePaymentResponse.recipientAmountSat} sats",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.SUCCESS,
                dedupeKey = "${WalletAdminNotificationTypes.PAYMENT_SENT}:${invoicePaymentResponse.paymentHash}",
                metadataJson =
                    buildJsonObject {
                        put("paymentKind", "lightning_invoice")
                        putPaymentResponse(invoicePaymentResponse)
                        putOptional("requestedAmountSats", invoicePaymentRequest.amountSat)
                        putOptional("exchangeRate", invoicePaymentRequest.exchangeRate)
                        putOptional("exchangeRateCurrency", invoicePaymentRequest.exchangeRateCurrency)
                    }.toString(),
            ),
        )
    }

    fun notifyOfferPaymentSent(
        actorUserId: String?,
        offerPaymentRequest: PayOfferRequest,
        offerPaymentResponse: PaymentResponse,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.PAYMENT_SENT,
                title = "Wallet offer payment sent",
                body = walletActorLabel(notificationActor) + " sent ${offerPaymentResponse.recipientAmountSat} sats",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.SUCCESS,
                dedupeKey = "${WalletAdminNotificationTypes.PAYMENT_SENT}:${offerPaymentResponse.paymentHash}",
                metadataJson =
                    buildJsonObject {
                        put("paymentKind", "bolt12_offer")
                        putPaymentResponse(offerPaymentResponse)
                        putOptional("requestedAmountSats", offerPaymentRequest.amountSat)
                    }.toString(),
            ),
        )
    }

    fun notifyOnchainPaymentSent(
        actorUserId: String?,
        onchainPaymentRequest: PayOnchainRequest,
        onchainPaymentResponse: PaymentResponse,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.PAYMENT_SENT,
                title = "Wallet on-chain payment sent",
                body = walletActorLabel(notificationActor) + " sent ${onchainPaymentResponse.recipientAmountSat} sats on-chain",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.SUCCESS,
                dedupeKey = "${WalletAdminNotificationTypes.PAYMENT_SENT}:${onchainPaymentResponse.paymentId}",
                metadataJson =
                    buildJsonObject {
                        put("paymentKind", "onchain")
                        putPaymentResponse(onchainPaymentResponse)
                        put("requestedAmountSats", onchainPaymentRequest.amountSat)
                        put("feerateSatByte", onchainPaymentRequest.feerateSatByte)
                    }.toString(),
            ),
        )
    }

    fun notifyPaymentFailed(
        actorUserId: String?,
        actionType: String,
        requestedAmountSats: Long?,
        paymentFailure: Throwable,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.PAYMENT_FAILED,
                title = "Wallet payment failed",
                body = walletActorLabel(notificationActor) + " attempted a wallet payment that failed",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.FAILED,
                metadataJson =
                    buildJsonObject {
                        put("paymentKind", actionType)
                        putOptional("requestedAmountSats", requestedAmountSats)
                        put("code", paymentFailure.walletNotificationCode())
                        put("category", paymentFailure.walletNotificationCategory())
                        putOptional("statusCode", (paymentFailure as? PhoenixServiceException)?.statusCode)
                        put("source", paymentFailure.walletNotificationSource())
                    }.toString(),
            ),
        )
    }

    fun notifyChannelClosed(
        actorUserId: String?,
        closeChannelRequest: CloseChannelRequest,
        closeChannelResponse: CloseChannelResponse,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.CHANNEL_CLOSED,
                title = "Wallet channel closed",
                body = walletActorLabel(notificationActor) + " closed a wallet channel",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.SUCCESS,
                dedupeKey = "${WalletAdminNotificationTypes.CHANNEL_CLOSED}:${closeChannelResponse.txId}",
                metadataJson =
                    buildJsonObject {
                        put("channelId", closeChannelRequest.channelId)
                        put("txId", closeChannelResponse.txId)
                        put("feerateSatByte", closeChannelRequest.feerateSatByte)
                    }.toString(),
            ),
        )
    }

    fun notifyFeesBumped(
        actorUserId: String?,
        feerateSatByte: Long,
        feeBumpResponse: String,
    ) {
        val notificationActor = resolveActor(actorUserId)
        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.FEE_BUMPED,
                title = "Wallet on-chain fees bumped",
                body = walletActorLabel(notificationActor) + " bumped pending on-chain fees",
                actorUserId = notificationActor?.userId,
                actorUserName = notificationActor?.userName,
                actorRole = notificationActor?.role,
                status = AdminNotificationStatuses.SUCCESS,
                metadataJson =
                    buildJsonObject {
                        put("feerateSatByte", feerateSatByte)
                        put("response", feeBumpResponse.take(MAX_METADATA_TEXT_LENGTH))
                    }.toString(),
            ),
        )
    }

    fun notifyIncomingPaymentReceived(paymentNotification: PaymentNotification) {
        if (paymentNotification.type != PHOENIX_PAYMENT_RECEIVED_TYPE) return

        createWalletNotification(
            AdminNotificationEvent(
                category = AdminNotificationCategories.WALLET,
                type = WalletAdminNotificationTypes.PAYMENT_RECEIVED,
                title = "Wallet payment received",
                body = "Wallet received ${paymentNotification.amountSat ?: 0} sats",
                actorUserName = "Phoenix webhook",
                actorRole = "system",
                status = AdminNotificationStatuses.SUCCESS,
                dedupeKey = paymentNotification.paymentHash?.let { "${WalletAdminNotificationTypes.PAYMENT_RECEIVED}:$it" },
                metadataJson =
                    buildJsonObject {
                        putOptional("amountSats", paymentNotification.amountSat)
                        putOptional("paymentHash", paymentNotification.paymentHash)
                        putOptional("externalId", paymentNotification.externalId)
                        putOptional("phoenixTimestamp", paymentNotification.timestamp)
                    }.toString(),
            ),
        )
    }

    private fun createWalletNotification(walletNotificationEvent: AdminNotificationEvent) {
        runCatching { adminNotificationService.createNotification(walletNotificationEvent) }
            .onFailure { notificationFailure ->
                logger.warn("Failed to create wallet admin notification: ${notificationFailure.message}")
            }
    }

    private fun resolveActor(actorUserId: String?): WalletNotificationActor? {
        val parsedActorId =
            actorUserId
                ?.let { runCatching { UUID.fromString(it) }.getOrNull() }
                ?: return null

        return transaction {
            (UsersTable innerJoin RolesTable)
                .selectAll()
                .where {
                    (UsersTable.id eq parsedActorId) and
                        (UsersTable.isDeleted eq false) and
                        (RolesTable.isDeleted eq false)
                }.map { row ->
                    WalletNotificationActor(
                        userId = row[UsersTable.id].value.toString(),
                        userName = row[UsersTable.name],
                        role = row[RolesTable.role],
                    )
                }.firstOrNull()
        }
    }

    private fun walletActorLabel(notificationActor: WalletNotificationActor?): String =
        notificationActor?.userName ?: notificationActor?.userId ?: "A wallet user"

    private fun Throwable.walletNotificationCode(): String =
        when (this) {
            is PhoenixServiceException -> code
            is UnsupportedBackendOperationException -> code
            is NwcServiceException -> "nwc_service_error"
            else -> "unknown"
        }

    private fun Throwable.walletNotificationCategory(): String =
        when (this) {
            is PhoenixServiceException -> category
            else -> "unknown"
        }

    private fun Throwable.walletNotificationSource(): String =
        when (this) {
            is PhoenixServiceException -> source
            is UnsupportedBackendOperationException -> source
            is NwcServiceException -> "nwc"
            else -> "ambrosia"
        }

    private fun JsonObjectBuilder.putPaymentResponse(paymentResponse: PaymentResponse) {
        put("recipientAmountSats", paymentResponse.recipientAmountSat)
        put("routingFeeSats", paymentResponse.routingFeeSat)
        put("paymentId", paymentResponse.paymentId)
        put("paymentHash", paymentResponse.paymentHash)
    }

    private fun JsonObjectBuilder.putOptional(
        key: String,
        value: Any?,
    ) {
        when (value) {
            null -> return
            is String -> put(key, value)
            is Long -> put(key, value)
            is Int -> put(key, value)
            is Double -> put(key, value)
        }
    }

    private data class WalletNotificationActor(
        val userId: String,
        val userName: String,
        val role: String,
    )

    private companion object {
        const val MAX_METADATA_TEXT_LENGTH = 500
        const val PHOENIX_PAYMENT_RECEIVED_TYPE = "payment_received"
    }
}

private typealias JsonObjectBuilder = kotlinx.serialization.json.JsonObjectBuilder
