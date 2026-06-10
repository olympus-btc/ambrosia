# Ambrosia Client

Next.js frontend for Ambrosia — a self-sovereign, local-first Bitcoin Point-of-Sale system. It renders the POS interface, proxies all API requests to the Kotlin/Ktor backend, and handles authentication, i18n, and real-time payment notifications.

This document is a map for contributors: how the app boots, how a request flows through it, and where each concern lives.

## Commands

```bash
npm run dev              # development server (localhost:3000)
npm run dev:electron     # development mode for Electron
npm run build            # production build
npm run build:electron   # build for Electron packaging
npm run lint             # ESLint check
npm run lint:fix         # auto-fix lint issues
npm test                 # run all Jest tests
npm run test:coverage    # tests with coverage report
```

## Tech stack

- **Next.js 16** with App Router (not Pages Router)
- **React 19** with hooks
- **HeroUI** component library built on top of Tailwind CSS
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **next-intl** for i18n (Spanish default, English available)
- **Jest + React Testing Library** for tests

## Startup flow

1. **`src/proxy.js`** — Next.js middleware that runs on every non-API, non-static request. It:
   - calls `/api/initial-setup` to determine whether the app is initialized and whether a `businessType` is configured
   - redirects to `/onboarding` if not initialized or if `businessType` is missing
   - redirects to `/auth` if there is no `refreshToken` cookie
   - sets an `x-business-type` response header and a `businessType` cookie used by downstream layout and navigation logic

2. **`src/app/layout.jsx`** — the root layout. It mounts the full provider tree (see [Provider hierarchy](#provider-hierarchy)), loads the root font, and renders the top-level shell.

3. **`src/app/(protected)/store/layout.jsx`** — wraps every store route inside `RequireOpenTurn`, which enforces that a shift is open before the POS can be used.

Everything the client can render is reachable by following route files under `src/app/` — that is the index of pages.

## Request flow

A typical API call travels through four layers:

```text
Component / hook
   │
   ▼
lib/http/httpClient.js     — auto token refresh on 401, auth event dispatching
   │
   ▼
lib/http/httpWrapper.js    — builds fetch call with base URL, headers, timeout
   │
   ▼
app/api/[...slug]/route.js — Next.js API proxy: forwards request to Kotlin backend,
                             forwards Set-Cookie headers back to the browser
   │
   ▼
Kotlin/Ktor backend        — REST API on port 9154 / 9443
```

### Key layers

- **`lib/http/httpClient.js`** — the single entry point for all API calls. Handles automatic token refresh: on a 401 it calls `POST /auth/refresh` (deduplicated with a shared promise), retries the original request, and dispatches `auth:expired` or `wallet:unauthorized` window events if refresh fails.
- **`lib/http/httpWrapper.js`** — builds the raw `fetch` call with the correct base URL, JSON headers, and a 30-second timeout.
- **`app/api/[...slug]/route.js`** — the proxy. Strips `content-length` (which breaks streaming), forwards the Kotlin backend's `Set-Cookie` headers to the browser (HTTP-only cookies cannot be set by client JS), and handles `204 No Content` responses.
- **`services/`** — one file per feature (`authService.js`, `walletService.js`, `shiftsService.js`, `ticketsService.js`, …). Services call `httpClient` and convert raw responses to typed data. Components and hooks import from services, never from `httpClient` directly.

### API client usage

```js
import { httpClient } from "@/lib/http";

const data = await httpClient("/users", { method: "GET" });
const result = await httpClient("/orders", { method: "POST", body: { ... } });
```

Options: `silentAuth` (suppress error toasts on 401), `skipRefresh` (skip token refresh), `notShowError` (suppress all error toasts).

### Component structure

Each feature component lives in its own folder. As it grows, it splits into subcomponent folders. Every subcomponent folder follows the same layout:

```text
YourFeature/
├── YourFeature.jsx         # root component exported by this feature
├── __tests__/              # tests for components at this level
├── locales/                # translation files for this level (en.js, es.js)
├── hooks/                  # optional — hooks scoped to this component tree
├── SubComponentA/
│   ├── SubComponentA.jsx
│   ├── __tests__/
│   ├── locales/
│   └── hooks/              # optional
└── SubComponentB/
    ├── SubComponentB.jsx
    ├── __tests__/
    └── locales/
```

Tests and locales are always colocated at the same level as the component they belong to. The `hooks/` folder is added only when the component or its children need hooks that are not shared outside that subtree.

### Adding a new feature

1. Add a service in `services/YourFeatureService.js` with functions that call `httpClient`.
2. Add a hook in `hooks/` if components need reactive state derived from the service.
3. Add the page component following the [component structure](#component-structure) above under `components/pages/Store/YourFeature/`.
4. Add the route file in `app/(protected)/store/your-feature/page.jsx` that renders the component.
5. Register the route in `lib/features.js` so it appears in navigation for the right `businessType`.
6. Add locale files colocated at `components/pages/Store/YourFeature/locales/` (see [Internationalization](#internationalization)).

## Authentication flow

1. PIN login at `/auth` — calls `POST /auth/login` through the proxy.
2. Backend sets three HTTP-only cookies: `accessToken` (60 s), `refreshToken` (30 days), `walletAccessToken` (8 h).
3. `httpClient` auto-refreshes `accessToken` on 401 via `POST /auth/refresh` — components never handle this manually.
4. Wallet operations require `walletAccessToken`, minted at `POST /wallet/auth` after a password challenge.
5. Auth state is held in `AuthProvider` and updated via window events — listen with `window.addEventListener("auth:expired", handler)`.

## Provider hierarchy

```jsx
AuthProvider               // user authentication state and session
  → ConfigurationsProvider // business config and logo
    → TurnProvider         // open/close shift management
      → I18nProvider       // next-intl, merges all page locale files flat
        → HeroUIProvider   // component library theming
```

Providers are mounted in `src/app/layout.jsx`. Each provider is colocated with its context and hook under `src/providers/`.

## Internationalization

Wrap user-facing strings with `t()` from `useTranslations`:

```jsx
import { useTranslations } from "next-intl";

function Component() {
  const t = useTranslations("namespace");
  return <span>{t("key")}</span>;
}
```

Locale files are colocated with their component in a `locales/` subfolder. `I18nProvider.jsx` imports only the top-level page locales and merges them flat — no changes are needed to `I18nProvider` when adding sub-locales.

```text
components/locales/           # shared (shifts, tours, loadingCard, offlinePage…)
pages/Store/locales/          # Store-level (navbar, dashboard) — imports sub-locales
  ├── Cart/locales/
  ├── Orders/locales/
  ├── Products/locales/
  ├── Reports/locales/
  ├── Settings/locales/       # imports sub-locales: Lightning, Printers, Seed, StoreInfo…
  ├── Users/locales/          # imports Roles/locales/
  └── Wallet/locales/         # imports CloseChannel, NodeInfo, Transactions
```

## Directory layout

```text
client/
├── src/
│   ├── proxy.js                    # Next.js middleware: auth guard, onboarding redirect, businessType routing
│   ├── app/                        # Next.js App Router
│   │   ├── (protected)/store/      # Auth-required POS routes (cart, orders, products, reports, settings, users, wallet)
│   │   ├── (public)/auth/          # PIN login page
│   │   ├── [section]/[...slug]/    # Catch-all — returns 404 for unknown paths
│   │   ├── api/[...slug]/          # API proxy — forwards requests to the Kotlin backend
│   │   ├── api/auth/               # Token refresh route
│   │   ├── api/ws-payments/        # SSE bridge for payment WebSocket notifications
│   │   ├── uploads/[...path]/      # File upload proxy route
│   │   ├── onboarding/             # Setup wizard
│   │   ├── unauthorized/           # Unauthorized page
│   │   ├── offline/                # PWA offline fallback (static)
│   │   ├── not-found.jsx           # Custom 404
│   │   └── layout.jsx / page.jsx   # Root layout (provider tree) and root redirect
│   ├── services/                   # One file per feature — calls httpClient, returns typed data
│   ├── hooks/                      # Shared React hooks (auth, turn/shift, tour, payments, PWA…)
│   ├── components/
│   │   ├── shared/                 # Reusable UI: AmountDisplay, DataTable, PageHeader,
│   │   │                           #   ImageUploader, CopyButton, DeleteButton, EditButton, ViewButton
│   │   ├── turn/                   # CloseTurnModal, OpenTurnForm, RequireOpenTurn, ShiftWidget
│   │   ├── auth/                   # WalletGuard
│   │   ├── hooks/                  # Component-scoped hooks: useBitcoinPrice, useCurrency, useUpload
│   │   ├── locales/                # Shared translation files
│   │   └── pages/                  # Page-level components (Auth, Onboarding, Store, NotFound, Unauthorized)
│   ├── lib/
│   │   ├── http/                   # httpClient, httpWrapper, parseJsonResponse
│   │   ├── auth/                   # authEvents, authLocalState, authSession
│   │   ├── features.js             # Feature/nav definitions by businessType
│   │   ├── getHomeRoute.js         # Resolves home route based on user role + businessType
│   │   └── utils.jsx               # Shared utilities
│   ├── providers/
│   │   ├── auth/                   # AuthProvider — user authentication state
│   │   ├── turn/                   # TurnProvider — shift/session management
│   │   └── configurations/         # ConfigurationsProvider — business config and logo
│   ├── reducers/auth/              # authReducer
│   ├── i18n/                       # I18nProvider — merges all page locales flat
│   ├── config/api.js               # API base URL config
│   └── utils/                      # array.js, storedAssetUrl.js
├── public/                         # Static assets (icons, manifest, offline page)
├── next.config.mjs                 # Next.js config: security headers, image domains, build settings
├── tailwind.config.js              # Tailwind config with HeroUI theme
└── Dockerfile                      # Multi-stage build → static export served by Nginx
```

## Testing

Test files are colocated in `__tests__/` directories next to the code they test.

```bash
npm test                                  # run all tests
npm test -- --watch                      # watch mode
npm test -- path/to/file.test.jsx        # single file
npm run test:coverage                     # coverage report
```

- Global mocks: `__tests__/__mocks__/` — next-intl, Next.js Image, framer-motion, SVGs, fetch
- Setup: `jest.setup.js` (jest-dom matchers), `__tests__/__mocks__/globals.js`
- Environment: jsdom

## Environment variables

Generated by `generate-env.cjs` from `~/.Ambrosia-POS/ambrosia.conf` or Docker environment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL (used in Docker mode) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for payment notifications |
| `NEXT_PUBLIC_ELECTRON` | Set to `true` in Electron mode |

## Where to go next

- [`../server/README.md`](../server/README.md) — Kotlin/Ktor backend architecture
- [`../electron/README.md`](../electron/README.md) — Electron desktop app
- [Project root README](../README.md) — installation guide and contribution guidelines
