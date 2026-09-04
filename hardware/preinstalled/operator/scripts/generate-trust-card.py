#!/usr/bin/env python3
"""Print a CA identity card from metadata obtained over a trusted channel.

Usage: generate-trust-card.py metadata.json > unit-trust-card.html
Read metadata on the physical console or transfer via authenticated SSH.
Never obtain the reference fingerprint from unauthenticated HTTP.
"""

import html
import json
import re
import sys
from pathlib import Path


def create_identity_card(trust_metadata):
    hostname = trust_metadata["hostname"]
    fingerprint = trust_metadata["sha256"]
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.local", hostname):
        raise ValueError("Invalid hostname")
    if not re.fullmatch(r"(?:[0-9A-F]{2}:){31}[0-9A-F]{2}", fingerprint):
        raise ValueError("Invalid SHA-256 fingerprint")
    return f"""<!doctype html><html lang="es"><meta charset="utf-8">
<title>Ambrosia · {html.escape(hostname)}</title>
<style>body{{font:18px/1.6 system-ui;max-width:600px;margin:40px auto;padding:24px;border:2px solid #165e39}}code{{overflow-wrap:anywhere}}@media print{{body{{margin:0}}}}</style>
<h1>Ambrosia · Identidad de la unidad / Unit identity</h1>
<p>{hostname}</p><p><code>http://{hostname}/trust/</code></p>
<p>CA SHA-256:</p><p><code>{fingerprint}</code></p>
<p>Antes de instalar, compara esta huella con el certificado descargado usando el visor del sistema. Conserva esta tarjeta. Un factory reset invalida esta identidad.</p>
<p lang="en">Before installing, compare this fingerprint with the downloaded certificate in your system viewer. Keep this card. A factory reset invalidates this identity.</p></html>"""


if __name__ == "__main__":
    print(create_identity_card(json.loads(Path(sys.argv[1]).read_text())))
