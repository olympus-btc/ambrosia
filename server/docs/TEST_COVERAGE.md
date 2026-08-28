# Server test coverage — state and priorities

Reference document for planning the server architecture refactor. It measures where the safety net
stands today, what the last pass covered, and what is still pending, in order of urgency.

Measured with `./gradlew koverXmlReport`.

## Why the distribution matters more than the total

The tests that protect an architecture change are the **HTTP contract** ones (request in → status
and body out): they survive the inner layers being rearranged. Service tests, bound to the
implementation, are exactly what a refactor breaks and forces you to rewrite.

The starting point had that ratio inverted: the service layer at 88% and the HTTP layer at 12.3%.
The 2,003 uncovered lines in `api/` were both the largest coverage gap and the boundary that has to
stay frozen during the refactor.

**A note on the e2e suite.** The 30 Python modules in `e2e_tests_py/` (~237 tests) do exercise many
of these routes, but they run against a separate server process, so Kover does not see them. They
cover contracts, but they boot a real server and take minutes: they are not a short-loop safety net
during a refactor. JVM route tests are. The two suites are complementary.

## Current state

| Metric | Before | Now |
|---|---|---|
| Line | 63.6% | **74.2%** |
| Branch | 28.2% | **37.4%** |
| Method | 71.6% | 79.8% |
| Class | 56.1% | 70.7% |

| Package | Before | Now | Uncovered |
|---|---|---|---|
| `pos/ambrosia/api` | 12.3% | **44.1%** | 1,276 |
| `pos/ambrosia/services` | 88.0% | 91.1% | 411 |
| `pos/ambrosia/utils` | 64.5% | 72.1% | 55 |
| `pos/ambrosia/models` | 77.8% | 89.8% | 74 |
| `pos/ambrosia` (Api.kt, Ambrosia.kt) | 11.1% | 16.6% | 226 |
| `pos/ambrosia/nwc` | 40.1% | 40.1% | 182 |
| `pos/ambrosia/config` | 31.0% | 31.0% | 87 |
| `pos/ambrosia/db/tables` | 92.7% | 92.7% | 48 |

Suite: **873 tests, 0 failures**, 59 classes. Every new class also passes on its own
(`--tests <Class> --rerun-tasks`), which is where a badly closed global-state seam would show up.

`koverVerify` runs in CI (`.github/workflows/server_unit_tests.yml`). The ratchet floor lives in
`app/build.gradle.kts`, a couple of points below what was measured: **70% line / 33% branch**.

## Covered in this pass (P0 + P1)

128 new tests across 8 files, in `app/src/test/kotlin/pos/ambrosia/utest/`.

| Production file | Before | Now | Test |
|---|---|---|---|
| `api/Checkout.kt` | 0.0% | 85.2% | `CheckoutRoutesTest` (15) |
| `api/Authorize.kt` | 0.0% | 84.2% | `AuthorizeRoutesTest` (14) |
| `api/Orders.kt` | 0.0% | 82.9% | `OrdersRoutesTest` (24) |
| `utils/AuthUtils.kt` | 66.2% | 81.7% | `AuthUtilsTest` (10) |
| `api/Uploads.kt` | 0.0% | 80.0% | `UploadsRoutesTest` (6) |
| `api/Products.kt` | 0.0% | 76.6% | `ProductsRoutesTest` (18) |
| `api/Wallet.kt` | 0.0% | 72.9% | `WalletRoutesTest` (25) |
| `api/ProductVariants.kt` | 0.0% | 66.7% | `ProductsRoutesTest` |
| `api/Payments.kt` | 0.0% | 66.4% | `PaymentsRoutesTest` (16) |
| `api/StoreOrders.kt` | 0.0% | 54.5% | `CheckoutRoutesTest` |
| `api/Handler.kt` | 43.1% | 50.5% | incidentally, from all of them |

### Contracts now pinned

What these tests freeze ahead of the refactor, beyond plain CRUD:

- **Wallet scheme separation.** `walletAccessToken` carries `scope=wallet_access` on an
  `HttpOnly`/`SameSite=Strict` cookie; logout revokes against the database (`users.wallet_token`),
  not just by signature. `POST /wallet/invoice` is the declared exception that works with a plain
  `accessToken`.
- **Login rate limiter.** Blocks after 5 failures with `Retry-After`, and a correct login does not
  get through the block. A successful login resets the counter.
- **Legacy 4-digit PINs.** The 6-digit rule belongs to user creation and editing; `/auth/login`
  must never validate length.
- **`requireAdmin()` depends on the `refreshToken` cookie**, not on the already-validated JWT
  principal.
- **Uploads are unauthenticated only before initial setup**, and the client filename is discarded
  (only the extension survives), so there is no traversal.
- **`POST /products/stock` is guarded by `orders_create`**, not by `products_update`.
- **The checkout discount check is an inline `requirePermission`**, not a route decorator.
- **Checkout idempotency**: replaying the same `paymentHash` returns the original sale (200), it
  does not create a second one (201). An unsettled invoice answers 202 `pending`, not a sale.
- **Store order cancellation** applies only to `open` orders with no table.

## Bugs found and fixed

All three were surfaced by the new coverage, and all three were real production failures.

1. **`GET /orders/{id}/complete` returned 500.** `CompleteOrder` crossed the HTTP boundary without
   `@Serializable`. The endpoint had never worked.
2. **`POST /orders/with-dishes` returned 500.** Same cause, in `OrderWithDishesRequest`.
3. **`PUT /orders/{id}/calculate-total` returned 500.** It responded with
   `mapOf("message" to String, "total" to Double)` — a `Map<String, Any>` kotlinx cannot serialize.
   Replaced by a serializable `OrderTotalResponse` that keeps the same JSON shape.

**Pattern to watch for**: a model without `@Serializable`, or a heterogeneous `Map`, inside a
`respond`/`receive` compiles fine and only fails at runtime. Homogeneous maps
(`Map<String,String>`, `Map<String,Int>`) do serialize. One case is still unverified, outside the
scope of this pass: `api/Routing.kt:19`, `mapOf("currency_id" to null)` on the public
`/base-currency` route.

## Pending, in order of urgency

### P2 — Admin and config surface

| File | Coverage | Uncovered | Why |
|---|---|---|---|
| `api/AdminNotifications.kt` | 2.5% | 119 | 9 admin endpoints plus web-push subscriptions |
| `api/InitialSetup.kt` | 21.0% | 79 | No auth; creates the first admin and reloads the lightning backend |
| `api/Reports.kt` | 0.0% | 71 | The service is at 96%, the routes at zero |
| `api/Shifts.kt` | 0.0% | 66 | `POST /{id}/close` hangs off `shifts_create`, not `shifts_update` |
| `api/Users.kt` | 34.0% | 64 | `/public` has no auth; inline `requireAdmin()` when the admin role is involved |
| `api/Roles.kt` | 32.9% | 51 | `PUT /{id}/permissions` sits inside the `roles_update` admin block |
| `api/Handler.kt` | 50.5% | 54 | **Branch at 5.3%**: ~30 exception mappings barely exercised |
| `api/Printers.kt` | 0.0% | 56 | Reads use plain `auth-jwt`, mutations use `printer_update` |

`Handler.kt` deserves attention of its own: it decides which status the client sees for every
exception, and a refactor that moves exceptions around breaks it silently. It rises incidentally
with each route test, but its branch coverage is still 5.3%.

### P3 — CRUD long tail

`Categories.kt` (59), `Tables.kt` (53), `Ingredients.kt` (53), `Suppliers.kt` (45), `Spaces.kt`
(43), `Tickets.kt` (43), `Dishes.kt` (41), `TicketTemplates.kt` (34), `Currency.kt` (24), all at
0%. ~395 lines. Mechanical: one test file per module following the established pattern.

### P4 — Services with weak branch coverage

| File | Line | Branch |
|---|---|---|
| `services/PrintService.kt` | 18.2% | 7.5% |
| `services/AuthService.kt` | 42.0% | 25.0% |
| `services/WalletAdminNotificationService.kt` | 43.2% | 26.8% |
| `services/UsersService.kt` | 45.9% | 31.4% |
| `services/ActiveLightningBackend.kt` | 33.3% | 30.0% |
| `services/TokenService.kt` | 83.2% | 36.7% |
| `nwc/NwcClient.kt` | 19.2% | — |
| `nwc/NostrEvent.kt` | 0.0% | — |

`NostrEvent.createSignedEvent` (Schnorr signing) and `NwcClient` (NIP-04/NIP-47 encryption) are
uncovered, and they are cryptography on the money path whenever NWC is the active backend.

### Not worth it

`Ambrosia.kt` (175 lines, Clikt CLI), `config/InjectLogs.kt`, `config/SeedGenerator.kt`,
`config/AppConfig.kt`, the rest of `models/` (serialization), `db/tables/` (declarative).

## How to write a route test

The infrastructure lives in `app/src/test/kotlin/pos/ambrosia/utils/`.

Almost every module in `api/` already separates dependency construction from route definition, and
that seam is what makes the test cheap:

```kotlin
fun Application.configureOrders() { /* builds real services */ }
fun Route.orders(orderService: OrderService) { /* routes */ }
```

The test mounts `fun Route.xxx(...)` with controlled dependencies and skips `configureXxx()`:

```kotlin
private fun ordersTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
    routeTest {
        val auth = installAdminAuth()
        grantPermissions("admin-test-role", "orders_read", "orders_create")
        installRoutes {
            routing { route("/orders") { orders(OrderService()) } }
        }
        block(auth)
    }
```

`routeTest` opens the temporary SQLite database and guarantees cleanup; `installAdminAuth` installs
both auth schemes and seeds a user; `installRoutes` adds `ContentNegotiation` and `handler()` on top
of the module under test.

Available pieces:

| Helper | File | Purpose |
|---|---|---|
| `routeTest { }` | `RouteTestSupport.kt` | Opens the temp database and cleans it up in `finally` |
| `installRoutes { }` | `RouteTestSupport.kt` | `ContentNegotiation` + `handler()` + routes |
| `grantPermissions(role, vararg)` | `RouteTestSupport.kt` | Creates missing permissions and assigns them |
| `jsonBody("…")` | `RouteTestSupport.kt` | `Content-Type` + body |
| `installAuthenticationWithoutUser()` | `RouteTestSupport.kt` | Schemes only, seeds no user |
| `setUserPin` / `setRolePassword` | `RouteTestSupport.kt` | Credentials with a real PBKDF2 hash |
| `installAdminAuth` / `installNonAdminAuth` / `installWalletAuth` | `AdminAuthTestFixture.kt` | Session cookies |
| `withAuthCookies` / `withAccessTokenOnly` | `AdminAuthTestFixture.kt` | With or without the wallet cookie |
| `ExposedTestDb.seedX(...)` | `ExposedTestDb.kt` | ~35 data factories |
| `FakeLightningBackend` | `FakeLightningBackend.kt` | Fake lightning backend, records calls |

`installAuthenticationWithoutUser` must not be combined with `installAdminAuth` or
`installWalletAuth`: those install the authentication plugin themselves, and installing it twice
fails.

Repo conventions: JUnit 4 (`org.junit.Before`/`After`) with `kotlin.test.Test`, `runBlocking` (not
`runTest`), mockito-kotlin (not MockK), backtick-quoted test names in English, package
`pos.ambrosia.utest`.

Two global-state warnings, which is where isolation between tests breaks:

- `LoginRateLimiter` (`api/Authorize.kt`) is a process-wide object keyed by IP, and under
  `testApplication` every request shares one address. Call `LoginRateLimiter.resetAll()` in
  `@Before`. The right long-term fix is to inject it into `Route.auth(...)`.
- `ActiveLightningBackend` is a singleton. Set it with `set(FakeLightningBackend())` and release it
  with `closeActive()` in `@After`.

Test files written before this pass still have their hand-written `@Before`/`@After` pair; they
were not migrated. New ones use `routeTest`.

## Commands

```bash
./gradlew test                              # full suite
./gradlew test --tests "WalletRoutesTest"   # a single class
./gradlew koverHtmlReport                   # app/build/reports/kover/html/index.html
./gradlew :app:koverVerify                  # the ratchet CI enforces
./gradlew ktlintFormat                      # required before opening the PR
```
