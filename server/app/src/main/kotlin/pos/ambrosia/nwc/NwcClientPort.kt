package pos.ambrosia.nwc

interface NwcClientPort {
    suspend fun connect(scope: kotlinx.coroutines.CoroutineScope)

    suspend fun makeInvoice(
        amountMsat: Long,
        description: String,
        expiry: Long?,
    ): Nip47Transaction

    suspend fun payInvoice(
        invoice: String,
        amountMsat: Long?,
    ): Nip47PayResult

    suspend fun getBalance(): Nip47Balance

    suspend fun getInfo(): Nip47Info

    suspend fun lookupInvoice(
        paymentHash: String? = null,
        invoice: String? = null,
    ): Nip47Transaction

    suspend fun listTransactions(
        from: Long? = null,
        until: Long? = null,
        limit: Int? = null,
        offset: Int? = null,
        unpaid: Boolean? = null,
        type: String? = null,
    ): List<Nip47Transaction>

    fun close()
}
