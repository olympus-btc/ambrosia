# Cobertura de tests del server — estado y prioridades

Documento de referencia para planificar el refactor de arquitectura del server. Mide dónde está
la red de seguridad hoy, qué se cubrió en la última pasada y qué queda pendiente por orden de
urgencia.

Medición: `./gradlew koverXmlReport` sobre la rama `development`.

## Por qué importa la distribución, no el total

Los tests que protegen un cambio de arquitectura son los de **contrato HTTP** (entra request →
sale status + body): sobreviven a que se reorganicen las capas de dentro. Los tests de servicio,
atados a la implementación, son justo lo que un refactor rompe y obliga a reescribir.

El punto de partida tenía esa proporción invertida: la capa de servicios al 88% y la capa HTTP al
12.3%. Los 2.003 renglones sin cubrir de `api/` eran a la vez el mayor hueco de cobertura y la
frontera que debe quedar congelada durante el refactor.

**Matiz sobre la suite e2e.** Los 30 módulos Python de `e2e_tests_py/` (~237 tests) sí ejercen
muchas de estas rutas, pero corren contra un proceso de servidor aparte, así que Kover no los ve.
Cubren contratos, pero arrancan un servidor real y tardan minutos: no sirven como red de bucle
corto durante un refactor. Los tests de ruta en JVM sí. Las dos suites son complementarias.

## Estado actual

| Métrica | Antes | Ahora |
|---|---|---|
| Línea | 63.6% | **74.2%** |
| Rama | 28.2% | **37.4%** |
| Método | 71.6% | 79.8% |
| Clase | 56.1% | 70.7% |

| Paquete | Antes | Ahora | Sin cubrir |
|---|---|---|---|
| `pos/ambrosia/api` | 12.3% | **44.1%** | 1.276 |
| `pos/ambrosia/services` | 88.0% | 91.1% | 411 |
| `pos/ambrosia/utils` | 64.5% | 72.1% | 55 |
| `pos/ambrosia/models` | 77.8% | 89.8% | 74 |
| `pos/ambrosia` (Api.kt, Ambrosia.kt) | 11.1% | 16.6% | 226 |
| `pos/ambrosia/nwc` | 40.1% | 40.1% | 182 |
| `pos/ambrosia/config` | 31.0% | 31.0% | 87 |
| `pos/ambrosia/db/tables` | 92.7% | 92.7% | 48 |

Suite: **873 tests, 0 fallos**, 59 clases. Cada clase nueva pasa también en solitario
(`--tests <Clase> --rerun-tasks`), que es donde se delataría un seam de estado global mal cerrado.

`koverVerify` corre en CI (`.github/workflows/server_unit_tests.yml`). El suelo del ratchet está en
`app/build.gradle.kts`, dos puntos por debajo de lo medido: **70% línea / 33% rama**.

## Cubierto en esta pasada (P0 + P1)

128 tests nuevos en 8 ficheros, en `app/src/test/kotlin/pos/ambrosia/utest/`.

| Fichero de producción | Antes | Ahora | Test |
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
| `api/Handler.kt` | 43.1% | 50.5% | de rebote, en todos |

### Contratos que quedan fijados

Lo que estos tests congelan de cara al refactor, más allá del CRUD:

- **Separación de esquemas del wallet.** `walletAccessToken` con `scope=wallet_access` y cookie
  `HttpOnly`/`SameSite=Strict`; el logout revoca contra la BD (`users.wallet_token`), no solo por
  firma. `POST /wallet/invoice` es la excepción declarada que va con `accessToken` a secas.
- **Rate limiter de login.** Bloqueo tras 5 fallos con `Retry-After`, y un login correcto no
  atraviesa el bloqueo. Un login válido resetea el contador.
- **PIN legacy de 4 dígitos.** La regla de 6 dígitos es de alta/edición; `/auth/login` nunca debe
  validar longitud.
- **`requireAdmin()` depende de la cookie `refreshToken`**, no del principal JWT ya validado.
- **Uploads sin auth solo antes del initial setup**, y el nombre de fichero del cliente se descarta
  (solo sobrevive la extensión), así que no hay traversal.
- **`POST /products/stock` va con `orders_create`**, no con `products_update`.
- **El descuento en checkout es un `requirePermission` en línea**, no un decorador de ruta.
- **Idempotencia de checkout**: repetir el mismo `paymentHash` devuelve la venta original (200),
  no crea una segunda (201). Una factura sin liquidar responde 202 `pending`, no una venta.
- **Cancelación de pedido de tienda** solo sobre pedidos `open` y sin mesa.

## Bugs encontrados y corregidos

Los tres los destapó la cobertura nueva; los tres eran fallos reales en producción.

1. **`GET /orders/{id}/complete` devolvía 500.** `CompleteOrder` cruzaba el límite HTTP sin
   `@Serializable`. El endpoint nunca funcionó.
2. **`POST /orders/with-dishes` devolvía 500.** Mismo motivo, en `OrderWithDishesRequest`.
3. **`PUT /orders/{id}/calculate-total` devolvía 500.** Respondía un
   `mapOf("message" to String, "total" to Double)`, es decir un `Map<String, Any>` que kotlinx no
   sabe serializar. Sustituido por un `OrderTotalResponse` serializable que conserva el mismo JSON.

**Patrón a vigilar**: un modelo sin `@Serializable` o un `Map` heterogéneo en un `respond`/`receive`
compila sin problemas y solo falla en tiempo de ejecución. Los `Map` homogéneos
(`Map<String,String>`, `Map<String,Int>`) sí serializan. Queda un caso sin verificar fuera del
alcance de esta pasada: `api/Routing.kt:19`, `mapOf("currency_id" to null)` en la ruta pública
`/base-currency`.

## Pendiente, por orden de urgencia

### P2 — Superficie admin/config

| Fichero | Cobertura | Sin cubrir | Por qué |
|---|---|---|---|
| `api/AdminNotifications.kt` | 2.5% | 119 | 9 endpoints admin más suscripciones web-push |
| `api/InitialSetup.kt` | 21.0% | 79 | Sin auth; crea el primer admin y recarga el backend lightning |
| `api/Reports.kt` | 0.0% | 71 | El servicio está al 96%, las rutas a cero |
| `api/Shifts.kt` | 0.0% | 66 | `POST /{id}/close` cuelga de `shifts_create`, no de `shifts_update` |
| `api/Users.kt` | 34.0% | 64 | `/public` sin auth; `requireAdmin()` en línea al tocar rol admin |
| `api/Roles.kt` | 32.9% | 51 | `PUT /{id}/permissions` dentro del bloque admin de `roles_update` |
| `api/Handler.kt` | 50.5% | 54 | **Rama al 5.3%**: ~30 mapeos de excepción casi sin ejercitar |
| `api/Printers.kt` | 0.0% | 56 | Lecturas con `auth-jwt` a secas, mutaciones con `printer_update` |

`Handler.kt` merece atención propia: es el que decide qué status ve el cliente ante cada
excepción, y un refactor que mueva excepciones de sitio lo rompe en silencio. Sube algo de rebote
con cada test de ruta, pero su cobertura de rama sigue en 5.3%.

### P3 — CRUD de cola larga

`Categories.kt` (59), `Tables.kt` (53), `Ingredients.kt` (53), `Suppliers.kt` (45), `Spaces.kt`
(43), `Tickets.kt` (43), `Dishes.kt` (41), `TicketTemplates.kt` (34), `Currency.kt` (24), todos al
0%. ~395 líneas. Mecánico: un fichero de test por módulo siguiendo el patrón ya establecido.

### P4 — Servicios con rama floja

| Fichero | Línea | Rama |
|---|---|---|
| `services/PrintService.kt` | 18.2% | 7.5% |
| `services/AuthService.kt` | 42.0% | 25.0% |
| `services/WalletAdminNotificationService.kt` | 43.2% | 26.8% |
| `services/UsersService.kt` | 45.9% | 31.4% |
| `services/ActiveLightningBackend.kt` | 33.3% | 30.0% |
| `services/TokenService.kt` | 83.2% | 36.7% |
| `nwc/NwcClient.kt` | 19.2% | — |
| `nwc/NostrEvent.kt` | 0.0% | — |

`NostrEvent.createSignedEvent` (firma Schnorr) y `NwcClient` (cifrado NIP-04/NIP-47) están sin
cubrir y son criptografía sobre el camino del dinero cuando NWC es el backend activo.

### No merece la pena

`Ambrosia.kt` (175 líneas, CLI Clikt), `config/InjectLogs.kt`, `config/SeedGenerator.kt`,
`config/AppConfig.kt`, `models/` restante (serialización), `db/tables/` (declarativo).

## Cómo escribir un test de ruta

La infraestructura vive en `app/src/test/kotlin/pos/ambrosia/utils/`.

Casi todos los módulos de `api/` ya separan la construcción de dependencias de la definición de
rutas, y ese seam es lo que hace el test barato:

```kotlin
fun Application.configureOrders() { /* construye servicios reales */ }
fun Route.orders(orderService: OrderService) { /* rutas */ }
```

El test monta el `fun Route.xxx(...)` con dependencias controladas y se salta el `configureXxx()`:

```kotlin
private fun ordersTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
    routeTest {                                   // SQLite temporal + cleanup garantizado
        val auth = installAdminAuth()             // instala auth-jwt y auth-jwt-wallet, siembra usuario
        grantPermissions("admin-test-role", "orders_read", "orders_create")
        installRoutes {                           // ContentNegotiation + handler() + el módulo
            routing { route("/orders") { orders(OrderService()) } }
        }
        block(auth)
    }
```

Piezas disponibles:

| Helper | Fichero | Para qué |
|---|---|---|
| `routeTest { }` | `RouteTestSupport.kt` | Abre la BD temporal y la limpia en `finally` |
| `installRoutes { }` | `RouteTestSupport.kt` | `ContentNegotiation` + `handler()` + rutas |
| `grantPermissions(rol, vararg)` | `RouteTestSupport.kt` | Crea permisos si faltan y los asigna |
| `jsonBody("…")` | `RouteTestSupport.kt` | `Content-Type` + cuerpo |
| `installAuthentication()` | `RouteTestSupport.kt` | Solo los esquemas, sin sembrar usuario |
| `setUserPin` / `setRolePassword` | `RouteTestSupport.kt` | Credenciales con hash PBKDF2 real |
| `installAdminAuth` / `installNonAdminAuth` / `installWalletAuth` | `AdminAuthTestFixture.kt` | Cookies de sesión |
| `withAuthCookies` / `withAccessTokenOnly` | `AdminAuthTestFixture.kt` | Con o sin cookie de wallet |
| `ExposedTestDb.seedX(...)` | `ExposedTestDb.kt` | ~35 factorías de datos |
| `FakeLightningBackend` | `FakeLightningBackend.kt` | Backend lightning falso, registra llamadas |

Convenciones del repo: JUnit 4 (`org.junit.Before`/`After`) con `kotlin.test.Test`, `runBlocking`
(no `runTest`), mockito-kotlin (no MockK), nombres de test entre backticks en inglés, paquete
`pos.ambrosia.utest`.

Dos avisos de estado global, que es donde se rompe el aislamiento entre tests:

- `LoginRateLimiter` (`api/Authorize.kt`) es un objeto de proceso cacheado por IP, y en
  `testApplication` todas las peticiones comparten dirección. Llama a `LoginRateLimiter.resetAll()`
  en el `@Before`. A largo plazo lo correcto es inyectarlo en `Route.auth(...)`.
- `ActiveLightningBackend` es un singleton. Ponlo con `set(FakeLightningBackend())` y suéltalo con
  `closeActive()` en el `@After`.

Los ficheros de test anteriores a esta pasada siguen con su pareja `@Before`/`@After` a mano; no se
migraron. Los nuevos usan `routeTest`.

## Comandos

```bash
./gradlew test                              # suite completa
./gradlew test --tests "WalletRoutesTest"   # una clase
./gradlew koverHtmlReport                   # app/build/reports/kover/html/index.html
./gradlew :app:koverVerify                  # el ratchet que corre en CI
./gradlew ktlintFormat                      # obligatorio antes del PR
```
