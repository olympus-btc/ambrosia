# Ambrosia Server

Kotlin/Ktor backend for Ambrosia — a self-sovereign, local-first Bitcoin Point-of-Sale system. It exposes the HTTP/WebSocket API consumed by the Next.js client, owns the SQLite database, and talks to a self-custodial Lightning Network node ([Phoenixd](https://github.com/ACINQ/phoenixd)) for payments and wallet operations.

This document is a map for contributors: how the app boots, how a request flows through it, and where each concern lives.

## Commands

```bash
./gradlew run                                    # start dev server (port 9154)
./gradlew test                                   # run all tests
./gradlew test --tests "ClassName"               # run single test class
./gradlew test --tests "ClassName.methodName"    # run single test
./gradlew ktlintCheck                            # lint
./gradlew ktlintFormat                           # auto-fix lint
./gradlew jar                                    # build fat JAR → app/build/libs/
```

## Tech stack

- **Kotlin** + **Ktor** (Netty engine) for the HTTP/WebSocket server
- **SQLite** accessed via raw JDBC (no ORM — see [Database](#database))
- **Flyway** for versioned schema migrations
- **Clikt** for the CLI entry point and config file management
- **Gradle** (Kotlin DSL) as the build tool, packaged as a fat JAR

## Startup flow

1. **`Ambrosia.kt`** — the process entry point. It's a [Clikt](https://ajalt.github.io/clikt/) `CliktCommand` that:
   - reads/writes the config file at `~/.Ambrosia-POS/ambrosia.conf` (override with the `AMBROSIA_DATADIR` env var)
   - resolves runtime options (HTTP bind ip/port, Phoenixd URL, TLS, etc.), persisting any defaults back to the config file
   - runs **Flyway** migrations against the SQLite database before the server accepts traffic
   - starts the Ktor server with `embeddedServer(Netty, ...)`, wiring it to `Api().module()`

2. **`Api.kt`** — the Ktor application module (`Application.module()`). It:
   - loads `AppConfig` and installs core plugins: `ContentNegotiation` (JSON), `CORS`, `WebSockets`, `StatusPages` (via [`handler()`](app/src/main/kotlin/pos/ambrosia/api/Handler.kt))
   - installs `Authentication` with two JWT schemes (see [Authentication](#authentication))
   - calls one `configure*()` function per feature module to register its routes (e.g. `configureUsers()`, `configureOrders()`, `configureWallet()`, …)

Everything the server can do is reachable from the `configure*()` calls at the bottom of `Api.kt` — that's the index of features.

## Request flow

A typical request travels through three layers:

```
HTTP request
   │
   ▼
api/<Feature>.kt        — Ktor routes: parse input, check auth/permissions, call the service, map the result to an HTTP response
   │
   ▼
services/<Feature>Service.kt — business logic: validation, orchestration, talking to other services (e.g. PhoenixService)
   │
   ▼
db/DatabaseConnection + raw JDBC — SQL against SQLite (prepared statements, no ORM)
```

- **`api/`** — one file per feature/route group (`Users.kt`, `Orders.kt`, `Payments.kt`, `Wallet.kt`, `Tickets.kt`, …). Each exposes a top-level `fun Application.configureX()` that installs its routes, plus a `fun Route.xRoutes(service: XService)` with the actual route definitions. Routes are thin: they decode request bodies into `models/`, enforce authentication/authorization, delegate to a service, and translate results/exceptions into HTTP responses.
- **`services/`** — one service per feature (`UsersService.kt`, `OrderService.kt`, `PaymentService.kt`, `PhoenixService.kt`, …), holding the actual business rules. Services are where validation, multi-step orchestration, and calls to external systems (Phoenixd, printers, etc.) live.
- **`models/`** — serializable data classes (`AppModels.kt`, `PhoenixModels.kt`, `TicketData.kt`, `TicketTemplate.kt`) shared between the API layer, services, and JSON (de)serialization.
- **`db/`** — `DatabaseConnection` is a thread-safe singleton wrapping a single JDBC `Connection` to `~/.Ambrosia-POS/ambrosia.db`.
- **`utils/`** — cross-cutting helpers: custom exceptions (`Exceptions.kt`), JWT/auth helpers (`AuthUtils.kt`), transaction helpers, PIN hashing, BOLT11 decoding, etc.
- **`config/`** — config file parsing (`ConfigFile.kt`, `AppConfig.kt`), environment variable names (`EnvVars.kt`), log injection, and seed generation.

### Adding a new feature

1. Add a model in `models/` if you need a new shape.
2. Add `services/YourFeatureService.kt` with the business logic and raw-JDBC queries.
3. Add `api/YourFeature.kt` with `fun Application.configureYourFeature()` and `fun Route.yourFeatureRoutes(service: YourFeatureService)`.
4. Register `configureYourFeature()` in `Api.kt` next to the other `configure*()` calls.
5. If you need new tables/columns, add a Flyway migration under `app/src/main/resources/db/migration/` (see [Database](#database) — never edit existing migration files).

## Authentication

The server uses two independent JWT cookie schemes, both installed in `Api.kt`:

| Cookie | Scheme name | Lifetime | Scope |
|---|---|---|---|
| `accessToken` | `auth-jwt` | 60s (configurable) | All standard protected routes |
| `walletAccessToken` | `auth-jwt-wallet` | 8h | `/wallet/*` endpoints only |

`walletAccessToken` is minted at `POST /wallet/auth` (requires a valid `accessToken` plus the user's role password) and carries `scope: "wallet_access"`. A 30-day refresh token is stored in `users.refresh_token` for revocation.

Routes opt into a scheme with decorators such as `authenticate("auth-jwt")`, `authenticateAdmin { ... }`, or `authenticate("auth-jwt-wallet")`. `AdminGuardService` and `PermissionsService` layer role/permission checks on top of authentication.

## Error handling

`api/Handler.kt` installs Ktor's `StatusPages` plugin and maps the app's custom exceptions (`utils/Exceptions.kt` — `ResourceNotFoundException`, `InvalidCredentialsException`, `PermissionDeniedException`, `PhoenixServiceException`, …) to JSON error responses with the right HTTP status. Throw a typed exception from a service rather than handling errors ad hoc in routes.

## Lightning / Phoenixd integration

`PhoenixService` wraps the Phoenixd HTTP API (invoices, payments, on-chain operations, node info, balance, channel management) using a Ktor `HttpClient`. `WalletRateService` and `Wallet.kt` build the `/wallet/*` endpoints on top of it, while `Webhook.kt` / `WebSocketPayments.kt` handle incoming payment notifications from Phoenixd (webhook + WebSocket push to the client).

## Database

- **SQLite**, stored at `~/.Ambrosia-POS/ambrosia.db`.
- **Raw JDBC only** — no ORM (no Exposed, no Hibernate). Use `Connection.prepareStatement(...)`.
- Schema evolves through **Flyway** migrations in `app/src/main/resources/db/migration/`, named `Vx__description.sql`. Existing migration files are immutable — always add a new one.

**Migration patterns**

Simple additions or removals — use direct SQL:
```sql
ALTER TABLE orders ADD COLUMN note TEXT;
ALTER TABLE orders DROP COLUMN waiter;
UPDATE products SET sku = NULL WHERE is_deleted = 1;
```

Modifying a column definition (nullability, type, constraint, UNIQUE) — SQLite cannot `ALTER COLUMN`, so recreate the table:
```sql
PRAGMA foreign_keys = OFF;

CREATE TABLE products_new (
    id BLOB PRIMARY KEY,
    SKU TEXT UNIQUE,
    name TEXT NOT NULL,
    ...
);

INSERT INTO products_new SELECT id, SKU, name, ... FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

PRAGMA foreign_keys = ON;
```

Rules:
- Wrap recreations with `PRAGMA foreign_keys = OFF/ON` whenever the table has FK relationships.
- Name the interim table `tablename_new` (double-underscore `tablename__new` is also used in the codebase — either is fine, but be consistent within the file).
- The `INSERT … SELECT` column list must be explicit — never use `SELECT *`.

## Directory layout

```
server/
├── app/src/main/kotlin/pos/ambrosia/
│   ├── Ambrosia.kt        # CLI entry point, config + Flyway + server bootstrap
│   ├── Api.kt             # Ktor module: plugins, auth schemes, route registration
│   ├── api/               # Route modules — one file per feature (thin HTTP layer)
│   ├── services/          # Business logic — one service per feature
│   ├── models/            # Shared serializable data classes
│   ├── db/                # DatabaseConnection (JDBC singleton)
│   ├── config/            # Config file, env vars, logging, seed generation
│   └── utils/             # Exceptions, auth helpers, transaction helpers, decoders
├── app/src/main/resources/
│   ├── db/migration/      # Flyway SQL migrations (Vx__description.sql)
│   └── ...                # logging config, templates, etc.
├── e2e_tests_py/          # Python end-to-end tests (see its own README)
└── Dockerfile             # Multi-stage build → runtime JRE image
```

## Testing

- Unit/integration tests: `./gradlew test` (see [Commands](#commands) for running a single class/method)
- End-to-end tests: Python suite under [`e2e_tests_py/`](e2e_tests_py/README.md), which spins up the real Kotlin server and exercises it over HTTP

## Where to go next

- [`e2e_tests_py/README.md`](e2e_tests_py/README.md) — end-to-end test setup and usage
- [Project root README](../README.md) and [`doc/`](../doc/) — overall project proposal, installation guide, contribution guidelines
