# Core Lightning + cln_nwc plugin, pinned for regtest reviewer testing of NWC.
#
# Why this image exists:
# - Phoenixd has no regtest LSP, so it cannot back the Ambrosia POS in regtest.
# - cln_nwc (https://github.com/gudnuf/cln_nwc) lets CLN expose a NIP-47 endpoint
#   over Nostr relays, which is exactly the contract NwcService talks to.
# - This image bakes the plugin + its Python deps onto the upstream CLN image so
#   the compose stack only needs to wire endpoints — no host-side install steps.

FROM elementsproject/lightningd:v25.02

# Upstream image already runs as root with /usr/bin/tini -- ./entrypoint.sh as
# the entrypoint; we just need to add the plugin and its Python deps.

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pin the plugin to a specific commit so reviewers get reproducible behavior.
# Bump CLN_NWC_REF when you want to track upstream.
ARG CLN_NWC_REF=main
RUN git clone https://github.com/gudnuf/cln_nwc /opt/cln_nwc \
    && cd /opt/cln_nwc \
    && git checkout "$CLN_NWC_REF"

RUN pip3 install --break-system-packages --no-cache-dir -r /opt/cln_nwc/requirements.txt

# cln_nwc hardcodes `wss://relay.getalby.com/v1` in three spots. Rewriting them
# to point at the in-stack nostr relay keeps the regtest loop offline and gives
# reviewers a deterministic environment. If you ever rebuild against a fork
# that already accepts a --nwc-relay option, this sed becomes a no-op.
ARG NWC_RELAY_URL=ws://nostr-relay:8080
RUN sed -i "s|wss://relay.getalby.com/v1|${NWC_RELAY_URL}|g" \
        /opt/cln_nwc/src/nwc.py /opt/cln_nwc/src/lib/nip47.py

RUN chmod +x /opt/cln_nwc/src/nwc.py

# The default ENTRYPOINT/CMD from the upstream image start lightningd. The
# compose service supplies --plugin=/opt/cln_nwc/src/nwc.py plus regtest flags.
