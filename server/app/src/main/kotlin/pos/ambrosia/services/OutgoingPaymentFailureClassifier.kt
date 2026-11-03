package pos.ambrosia.services

object OutgoingPaymentFailureCategories {
    const val LOCAL_VALIDATION = "local_validation"
    const val LOCAL_WALLET_STATE = "local_wallet_state"
    const val REMOTE_ROUTING = "remote_routing"
    const val REMOTE_LIQUIDITY = "remote_liquidity"
    const val FEE_OR_CLTV = "fee_or_cltv"
    const val TEMPORARY_BACKEND = "temporary_backend"
    const val UNKNOWN = "unknown"
}

data class OutgoingPaymentFailureClassification(
    val code: String,
    val category: String,
    val statusCode: Int,
)

object OutgoingPaymentFailureClassifier {
    fun classify(failureMessage: String): OutgoingPaymentFailureClassification {
        val normalizedFailureMessage = failureMessage.lowercase()
        val compactFailureMessage = normalizedFailureMessage.filter { it.isLetterOrDigit() }

        return when {
            "already paid" in normalizedFailureMessage ||
                "already been paid" in normalizedFailureMessage ||
                "alreadypaid" in compactFailureMessage -> {
                OutgoingPaymentFailureClassification(
                    code = "invoice_already_paid",
                    category = OutgoingPaymentFailureCategories.LOCAL_VALIDATION,
                    statusCode = 409,
                )
            }

            "expired" in normalizedFailureMessage && "invoice" in normalizedFailureMessage -> {
                OutgoingPaymentFailureClassification(
                    code = "invoice_expired",
                    category = OutgoingPaymentFailureCategories.LOCAL_VALIDATION,
                    statusCode = 410,
                )
            }

            isInvalidInvoiceFailure(normalizedFailureMessage, compactFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "invalid_invoice",
                    category = OutgoingPaymentFailureCategories.LOCAL_VALIDATION,
                    statusCode = 400,
                )
            }

            isMissingAmountFailure(normalizedFailureMessage, compactFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "missing_amount",
                    category = OutgoingPaymentFailureCategories.LOCAL_VALIDATION,
                    statusCode = 400,
                )
            }

            isLocalWalletStateFailure(normalizedFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "insufficient_funds",
                    category = OutgoingPaymentFailureCategories.LOCAL_WALLET_STATE,
                    statusCode = 402,
                )
            }

            isFeeOrCltvFailure(normalizedFailureMessage, compactFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "fee_or_cltv",
                    category = OutgoingPaymentFailureCategories.FEE_OR_CLTV,
                    statusCode = 422,
                )
            }

            isRemoteLiquidityFailure(normalizedFailureMessage, compactFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "remote_liquidity",
                    category = OutgoingPaymentFailureCategories.REMOTE_LIQUIDITY,
                    statusCode = 422,
                )
            }

            isRemoteRoutingFailure(normalizedFailureMessage, compactFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "recipient_rejected_payment",
                    category = OutgoingPaymentFailureCategories.REMOTE_ROUTING,
                    statusCode = 422,
                )
            }

            isTemporaryBackendFailure(normalizedFailureMessage) -> {
                OutgoingPaymentFailureClassification(
                    code = "node_unavailable",
                    category = OutgoingPaymentFailureCategories.TEMPORARY_BACKEND,
                    statusCode = 503,
                )
            }

            else -> {
                OutgoingPaymentFailureClassification(
                    code = "unknown",
                    category = OutgoingPaymentFailureCategories.UNKNOWN,
                    statusCode = 502,
                )
            }
        }
    }

    private fun isInvalidInvoiceFailure(
        normalizedFailureMessage: String,
        compactFailureMessage: String,
    ): Boolean =
        ("invalid" in normalizedFailureMessage && "invoice" in normalizedFailureMessage) ||
            ("invalid" in normalizedFailureMessage && "bolt11" in normalizedFailureMessage) ||
            "invalidbolt11invoice" in compactFailureMessage ||
            "invalidinvoice" in compactFailureMessage ||
            "malformed invoice" in normalizedFailureMessage

    private fun isMissingAmountFailure(
        normalizedFailureMessage: String,
        compactFailureMessage: String,
    ): Boolean =
        ("missing" in normalizedFailureMessage && "amount" in normalizedFailureMessage) ||
            "amount is required" in normalizedFailureMessage ||
            "missingamount" in compactFailureMessage

    private fun isLocalWalletStateFailure(normalizedFailureMessage: String): Boolean =
        (
            ("insufficient" in normalizedFailureMessage || "not enough" in normalizedFailureMessage) &&
                ("fund" in normalizedFailureMessage || "balance" in normalizedFailureMessage)
        ) ||
            ("channel" in normalizedFailureMessage && "not connected" in normalizedFailureMessage) ||
            ("channel" in normalizedFailureMessage && "opening" in normalizedFailureMessage) ||
            ("channel" in normalizedFailureMessage && "closing" in normalizedFailureMessage)

    private fun isRemoteRoutingFailure(
        normalizedFailureMessage: String,
        compactFailureMessage: String,
    ): Boolean =
        "recipient node rejected the payment" in normalizedFailureMessage ||
            "recipient rejected" in normalizedFailureMessage ||
            "recipientnoderejectedthepayment" in compactFailureMessage ||
            "recipientrejected" in compactFailureMessage ||
            "recipient offline" in normalizedFailureMessage ||
            "recipientoffline" in compactFailureMessage ||
            "remote failure" in normalizedFailureMessage ||
            "route not found" in normalizedFailureMessage ||
            "routenotfound" in compactFailureMessage ||
            "routing" in normalizedFailureMessage

    private fun isRemoteLiquidityFailure(
        normalizedFailureMessage: String,
        compactFailureMessage: String,
    ): Boolean =
        "payment timeout" in normalizedFailureMessage ||
            "paymenttimeout" in compactFailureMessage ||
            "recipient liquidity" in normalizedFailureMessage ||
            "remote liquidity" in normalizedFailureMessage ||
            "not enough liquidity" in normalizedFailureMessage ||
            "temporary channel failure" in normalizedFailureMessage ||
            "temporarychannelfailure" in compactFailureMessage

    private fun isFeeOrCltvFailure(
        normalizedFailureMessage: String,
        compactFailureMessage: String,
    ): Boolean =
        "trampoline fee insufficient" in normalizedFailureMessage ||
            "trampolinefeeinsufficient" in compactFailureMessage ||
            "fee insufficient" in normalizedFailureMessage ||
            "feeinsufficient" in compactFailureMessage ||
            "not enough fee" in normalizedFailureMessage ||
            "not enough fees" in normalizedFailureMessage ||
            "expiry too soon" in normalizedFailureMessage ||
            "expirytoosoon" in compactFailureMessage ||
            "trampolineexpirytoosoon" in compactFailureMessage ||
            "cltv" in normalizedFailureMessage

    private fun isTemporaryBackendFailure(normalizedFailureMessage: String): Boolean =
        "timeout" in normalizedFailureMessage ||
            "timed out" in normalizedFailureMessage ||
            "unavailable" in normalizedFailureMessage ||
            "connection" in normalizedFailureMessage ||
            "connection refused" in normalizedFailureMessage ||
            "backend" in normalizedFailureMessage
}
