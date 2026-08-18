FROM elementsproject/lightningd:v25.02

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG CLN_NWC_REF=main
RUN git clone https://github.com/gudnuf/cln_nwc /opt/cln_nwc \
    && cd /opt/cln_nwc \
    && git checkout "$CLN_NWC_REF"

RUN pip3 install --break-system-packages --no-cache-dir -r /opt/cln_nwc/requirements.txt

ARG NWC_RELAY_URL=ws://nostr-relay:8080
RUN sed -i "s|wss://relay.getalby.com/v1|${NWC_RELAY_URL}|g" \
        /opt/cln_nwc/src/nwc.py /opt/cln_nwc/src/lib/nip47.py

RUN chmod +x /opt/cln_nwc/src/nwc.py
