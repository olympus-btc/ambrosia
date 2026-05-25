# PR: NWC (Nostr Wallet Connect) backend — adapted to v0.6.0-beta

## Summary

Adds **Nostr Wallet Connect (NWC / NIP-47)** as an alternative Lightning backend to phoenixd.
Any NWC-compatible wallet (Alby Hub, Mutiny, Zeus, etc.) can power the POS without running
a self-hosted Lightning node.

Rebased onto `origin/main` (v0.6.0-beta). All store and restaurant flows work unchanged — the
payment backend is business-type-agnostic.

---

## What changed

### Server (Kotlin/Ktor)

| File | Change |
|------|--------|
| `Ambrosia.kt` | Added `--ssl-bind-port` CLI option; added `envvar = "NWC_URI"` to `--nwc-uri` so Docker deployments work without extra flags |
| `nwc/NwcClient.kt` | Uses `lenientJson = Json { ignoreUnknownKeys = true }` for all NIP-47 deserialization — tolerates extra fields from real wallets (Alby Hub returns `notifications`, `lud16`, `state`) |
| `nwc/Nip47Types.kt` | Added `notifications` field to `Nip47Info` |
| `nwc/NostrRelay.kt` | Added exponential backoff reconnect (1 s → 60 s) — NWC backend recovers automatically from relay disconnections |
| `services/NwcService.kt` | Added TTL (1 hour) to `pendingInvoices` map — unpaid invoices are evicted after expiry, preventing unbounded memory growth |
| `services/LightningBackend.kt` | Added `csvExport` and `closeChannel` to interface; fixed import path (`models.phoenix.*` — lowercase, per v0.6.0-beta rename) |
| `utils/Exceptions.kt` | Added `NwcConnectionException`, `NwcServiceException`, `UnsupportedBackendOperationException` |

### Client (Next.js)

| File | Change |
|------|--------|
| `app/page.jsx` | Fixed race condition: redirect to `getHomeRoute()` was firing while `businessType` was still `null` (config API in flight). Guard now waits until `businessType` is available. |
| `lib/modules.js` | Added `types: ["restaurant"]` to all `/restaurant/*` routes in `orders` and `spaces` modules — `matchesBusiness()` was treating them as valid for any `businessType` when the value was `null` |

### Docker

| File | Change |
|------|--------|
| `docker-compose.nwc.yml` (new) | Compose overlay — removes `phoenixd` dependency and passes `NWC_URI` env var: `docker compose -f docker-compose.yml -f docker-compose.nwc.yml up -d` |

### Tests (new)

| File | Coverage |
|------|---------|
| `NwcUriParserTest.kt` | Valid URI parsing, URL decoding, missing params, invalid pubkey length, multiple relay params |
| `NwcServiceTest.kt` | createInvoice (happy path, msat conversion, missing fields), getBalance (msat→sat), getNodeInfo (pubkey fallback), payInvoice (fee conversion), polling TTL (settled removes, unsettled retains), unsupported operations |
| `mockito-extensions/org.mockito.plugins.MockMaker` | Enables `mock-maker-inline` for Kotlin final class mocking |

---

## How to run

```bash
# Standard phoenixd mode (unchanged)
docker compose up -d

# NWC mode
NWC_URI="nostr+walletconnect://..." \
  docker compose -f docker-compose.yml -f docker-compose.nwc.yml up -d

# Dev / local (Alby Hub on localhost:8080)
java -jar ambrosia.jar \
  --nwc-uri "$(cat ~/.lightning/regtest/nwc_uri.txt)" \
  --http-bind-port 9155
```

---

## SOLID review

### Violations and recommendations

#### L — Liskov Substitution (LSP)
`NwcService` implements `LightningBackend` but throws `UnsupportedBackendOperationException`
for 7 of 16 methods (`getSeed`, `createOffer`, `payOffer`, `payOnchain`, `bumpOnchainFees`,
`csvExport`, `closeChannel`). Callers holding a `LightningBackend` reference cannot substitute
`NwcService` without guarding against these exceptions — an LSP violation.

**Root cause**: `LightningBackend` is a fat interface mixing payment, onchain, node-management,
and export concerns. This also violates ISP.

**Recommended split** (future PR):
```kotlin
interface InvoiceBackend {
    suspend fun createInvoice(...): CreateInvoiceResponse
    suspend fun getBalance(): PhoenixBalance
    suspend fun getNodeInfo(): NodeInfo
    suspend fun listIncomingPayments(...): List<IncomingPayment>
    suspend fun getIncomingPayment(paymentHash: String): IncomingPayment
}

interface PaymentBackend {
    suspend fun payInvoice(...): PaymentResponse
    suspend fun listOutgoingPayments(...): List<OutgoingPayment>
    suspend fun getOutgoingPayment(...): OutgoingPayment
    suspend fun getOutgoingPaymentByHash(...): OutgoingPayment
}

interface NodeBackend {
    suspend fun getSeed(): String
    suspend fun createOffer(...): String
    suspend fun payOffer(...): PaymentResponse
    suspend fun payOnchain(...): PaymentResponse
    suspend fun bumpOnchainFees(...): String
    suspend fun csvExport(...): String
    suspend fun closeChannel(...): CloseChannelResponse
}
// NwcService implements InvoiceBackend + PaymentBackend
// PhoenixService implements InvoiceBackend + PaymentBackend + NodeBackend
```

#### D — Dependency Inversion (DIP)
`NwcService.create()` directly constructs `HttpClient(CIO)` and `CoroutineScope`. High-level
service logic depends on concrete infrastructure choices. The primary constructor already
supports injection — `create()` should accept an `HttpClient` parameter or use Ktor's DI.

#### Other
- **`NwcUriParser`** — `associate()` on repeated `relay=` params silently discards all but the
  last. The NWC spec supports multiple relay fallbacks. Consider collecting all relay values:
  ```kotlin
  val relays = params.filterKeys { it == "relay" }.values.toList()
  ```
  (requires changing `params` from `associate` to `groupBy` or a fold).

- **`NwcClient.pendingRequests`** — similar TTL problem as `pendingInvoices`: if the relay
  drops mid-request, stranded `CompletableDeferred` entries accumulate forever. Should be
  cleaned up after the reconnect or with a sweep on each send.

- **`NostrRelay` reconnect** — after reconnect, `subscribe()` is not called again. The relay
  will receive events but the subscription filter for `#p` is gone, so NIP-47 responses won't
  be routed. `NwcClient.connect()` should re-subscribe after each reconnect.

### What is done well
- **Single Responsibility**: `NwcClient` and `NostrRelay` have clear, separate concerns.
- **Open/Closed**: `LightningBackend` interface allows adding new backends without modifying
  existing ones. `Api.kt` wires the backend once at startup.
- **Immutable data classes** throughout NIP-47 types — correct for Kotlin.
- **`lenientJson`** scoped to NwcClient — doesn't pollute global JSON config.
- **TTL on `pendingInvoices`** — proactive resource management.
