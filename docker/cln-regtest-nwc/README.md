# Regtest NWC review stack

Reviewer-focused docker overlay that runs a self-contained
`bitcoind regtest → Core Lightning → cln_nwc plugin → nostr-rs-relay → Ambrosia`
loop so the NWC backend can be exercised end-to-end without depending on
phoenixd (which has no regtest LSP).

## Components

| Service | Image / build | Purpose |
| --- | --- | --- |
| `bitcoind` | `lightninglabs/bitcoin-core:25` | Bitcoin Core regtest, JSON-RPC + ZMQ. |
| `lightningd` | `docker/cln-regtest-nwc/Dockerfile` | CLN v25.02 with the [gudnuf/cln_nwc](https://github.com/gudnuf/cln_nwc) plugin baked in. Exposes NIP-47 over the local Nostr relay. |
| `nostr-relay` | `scsibug/nostr-rs-relay:latest` | Local relay so the cln_nwc plugin and Ambrosia talk without external infra. |
| `ambrosia-dev` | `server/Dockerfile` | Same server image as the dev stack, with `NWC_URI` wired in via env. |
| `client-dev` | `node:20-alpine` | Next.js dev server with hot-reload on `./client`. |

Ports are bound to `127.0.0.1` only so the regtest stack never leaks to the LAN.
The volume names are prefixed `*_regtest_*` so production / dev-nwc volumes are
untouched.

## Quickstart

```bash
# 1. Build images and bring everything up
docker compose -f docker-compose.regtest-nwc.yml up -d --build

# 2. Wait for bitcoind + lightningd to settle (~15 s on first run), then mine
#    the maturity window so CLN can use its wallet.
docker compose -f docker-compose.regtest-nwc.yml exec bitcoind \
  bitcoin-cli -regtest -rpcuser=ambrosia -rpcpassword=ambrosia \
  createwallet test 2>/dev/null || true

docker compose -f docker-compose.regtest-nwc.yml exec bitcoind \
  bitcoin-cli -regtest -rpcuser=ambrosia -rpcpassword=ambrosia \
  -rpcwallet=test -generate 101

# 3. Mint a NWC connection from CLN. The output contains the URI to copy.
docker compose -f docker-compose.regtest-nwc.yml exec lightningd \
  lightning-cli --regtest nwc-create 1000000000 0

# 4. Either paste the URI into the onboarding wallet-backend step on
#    http://localhost:3002 (the server hot-reloads thanks to B3), or restart
#    ambrosia-dev with NWC_URI pre-set to skip onboarding:
NWC_URI="nostr+walletconnect://..." \
  docker compose -f docker-compose.regtest-nwc.yml up -d ambrosia-dev
```

Frontend is at `http://localhost:3002`, API at `http://localhost:9156`.

## What to exercise

- **Receive flow**: create a cart in the POS, accept Lightning payment, watch
  `NwcService.pollPendingInvoices` reconcile the settled invoice via a single
  `list_transactions` round-trip (I6).
- **Hot-reload**: paste a different NWC URI in onboarding; the server should
  hot-reload the backend without a restart (B3) and the old backend should be
  closed (I2).
- **Reconnect**: `docker compose -f docker-compose.regtest-nwc.yml restart nostr-relay`
  and confirm Ambrosia keeps working — the NIP-47 subscription should be
  re-emitted (I5) and in-flight requests should fail fast instead of waiting
  out the 30 s timeout (N7).
- **Channel UI**: open the Wallet card; the synthesized `channels` list is
  empty (U2), so no "Close Channel" button leaks 501s (B4).

## Teardown

```bash
docker compose -f docker-compose.regtest-nwc.yml down -v
```

`-v` drops the regtest chain, the CLN wallet, the Nostr relay DB, and the
Ambrosia dev DB. Production volumes are not touched.

## Caveats

- `cln_nwc` is pinned to its `main` branch via the `CLN_NWC_REF` build arg in
  `docker/cln-regtest-nwc/Dockerfile`. Bump it (and `--build` the image) when
  you want to track upstream.
- The plugin hardcodes `wss://relay.getalby.com/v1` as its relay; the
  Dockerfile rewrites that to `ws://nostr-relay:8080` (the in-stack relay) so
  the regtest loop stays offline. Override via `--build-arg NWC_RELAY_URL=...`
  if you want to point it elsewhere.
- The first build can take several minutes — the CLN base image is ~1 GB and
  `pip install` pulls cryptography wheels.
- The cln_nwc plugin is beta upstream; do not point it at funds you are not
  willing to lose. Regtest only.
