#!/bin/bash
# Generate printable vendor cards (one per unit) from the fleet password log
# written by wipe-and-provision.sh. Each card includes hardware setup steps,
# a QR code for the unit's HTTPS URL, the URL in readable text, and the
# per-unit login credentials (small print, for admin use only).
#
# Open the resulting HTML in a browser and print on letter paper.
#
# Usage: ./generate-vendor-cards.sh [options]
#   --ssid "Name"       Wi-Fi SSID vendors should connect to (default: "the venue Wi-Fi")
#   --wifi-password <p> Wi-Fi password. If given (along with --ssid), each card
#                       gets a small Wi-Fi QR code that iOS 11+/Android 10+
#                       cameras auto-recognize as a join-network prompt.
#   --wifi-auth <type>  Wi-Fi auth type for the QR: WPA (default), WEP, or nopass.
#   --support-url <url> Support group invite URL (e.g. Telegram t.me/+AbCd...).
#                       Renders a small "need help?" QR on each card.
#   --lang <code>       Card language: en (default) or es (Mexican Spanish).
#   --log <path>        password log path (default: ~/ambrosia-fleet-passwords.txt)
#   --out <path>        output HTML file (default: ~/ambrosia-vendor-cards.html)

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

SSID="the venue Wi-Fi"
WIFI_PASSWORD=""
WIFI_AUTH="WPA"
SUPPORT_URL=""
CARD_LANG="en"
LOG="$HOME/ambrosia-fleet-passwords.txt"
OUT="$REPO_ROOT/out/ambrosia-vendor-cards.html"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --ssid)          SSID="$2"; shift 2 ;;
        --wifi-password) WIFI_PASSWORD="$2"; shift 2 ;;
        --wifi-auth)     WIFI_AUTH="$2"; shift 2 ;;
        --support-url)   SUPPORT_URL="$2"; shift 2 ;;
        --lang)          CARD_LANG="$2"; shift 2 ;;
        --log)           LOG="$2"; shift 2 ;;
        --out)           OUT="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,17p' "$0" | sed 's|^# *||'
            exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# Normalize language code
case "$CARD_LANG" in
    es|es-mx|es-MX|es_MX|es_mx) CARD_LANG="es" ;;
    en|en-us|en-US|en_US)       CARD_LANG="en" ;;
    *) echo "Unknown language: $CARD_LANG (supported: en, es)" >&2; exit 1 ;;
esac

if [[ ! -r "$LOG" ]]; then
    echo "Password log not found or unreadable: $LOG" >&2
    exit 1
fi
if ! command -v qrencode >/dev/null 2>&1; then
    echo "qrencode is required. Install with: sudo apt install -y qrencode" >&2
    exit 1
fi

# Translations. All user-visible text is keyed here; HTML template below uses
# the T_* variables only.
if [[ "$CARD_LANG" == "es" ]]; then
    T_HTML_LANG="es-MX"
    T_TITLE="Tarjetas para vendedores — Ambrosia"
    T_PAGE_NOTE="Imprime en papel tamaño carta. Corta por las líneas punteadas y entrega una tarjeta a cada vendedor."
    T_PRODUCT="Ambrosia POS"
    T_STEPS_TITLE="Pasos de configuración"
    T_STEP_1_PRE="<b>Inserta la tarjeta microSD</b> en la ranura de la OrangePi."
    T_STEP_2_PRE="Conecta el <b>cable de corriente USB-C</b> a la OrangePi."
    T_STEP_3_PRE="Espera unos <b>60 segundos</b> a que encienda."
    T_STEP_4_PRE="Conecta tu teléfono a"
    T_STEP_4_WIFI_SUFFIX=" &mdash; <b>escanea el QR de Wi-Fi &nearr;</b>"
    T_WIFI_TITLE="Wi-Fi"
    T_WIFI_SCAN_HINT="Escanea para unirte al Wi-Fi (iOS 11+ / Android 10+)."
    T_WIFI_NAME_LABEL="Red:"
    T_WIFI_PASS_LABEL="Contraseña:"
    T_POS_TITLE="Ambrosia POS App"
    T_POS_HINT="Escanea para abrir la app."
    T_SUPPORT_TITLE="Soporte"
    T_SUPPORT_TEXT="Escanea para unirte al chat de soporte en <b>Telegram</b>."
    T_SUPPORT_NOTE="Requiere cuenta de Telegram."
    T_STEP_5_PRE="Abre la cámara del teléfono y <b>escanea el código QR &rarr;</b>"
    # Step 6 (browser warning) — include the hostname inline
    T_STEP_6_TEMPLATE='Tu navegador te advertirá que la conexión <b>"no es privada"</b>. Es esperado en una red local y <b>seguro aquí</b>. Toca <b>Avanzado</b> (o <b>Mostrar detalles</b> en Safari), luego <b>Continuar a %s.local</b> o <b>Aceptar el riesgo</b> (varía según el navegador).'
    T_STEP_7_PRE="Crea tu <b>cuenta de administrador</b> en el asistente. <em>Anota tu contraseña.</em>"
    T_SSH_TITLE="Acceso SSH"
    T_SSH_SUBTITLE="(solo para uso avanzado o fuera de la kermés):"
    T_PASSWORD_LABEL="Contraseña:"
    T_CHANGE_PASSWORD="Cambia esta contraseña al iniciar sesión SSH por primera vez con el comando <code>passwd</code>."
    T_TROUBLE_HEAD="¿Problemas?"
    T_TROUBLE_BODY_TEMPLATE='Si el QR no abre, escribe la URL a mano. Si la página no carga, verifica que tu teléfono esté conectado a <b>%s</b>.'
    T_SUPPORT_HEAD="¿Necesitas ayuda?"
    T_SUPPORT_L1="Escanea para unirte"
    T_SUPPORT_L2="al chat de soporte."
else
    T_HTML_LANG="en"
    T_TITLE="Ambrosia vendor cards"
    T_PAGE_NOTE="Print on letter paper. Cut along the dashed lines and hand one card to each vendor."
    T_PRODUCT="Ambrosia POS"
    T_STEPS_TITLE="Setup steps"
    T_STEP_1_PRE="<b>Insert the microSD card</b> into the slot on the OrangePi."
    T_STEP_2_PRE="Plug the <b>USB-C power cable</b> into the OrangePi."
    T_STEP_3_PRE="Wait about <b>60 seconds</b> for it to start up."
    T_STEP_4_PRE="Connect your phone to"
    T_STEP_4_WIFI_SUFFIX=" &mdash; <b>scan the Wi-Fi QR &nearr;</b>"
    T_WIFI_TITLE="Wi-Fi"
    T_WIFI_SCAN_HINT="Scan to join the Wi-Fi (iOS 11+ / Android 10+)."
    T_WIFI_NAME_LABEL="Network:"
    T_WIFI_PASS_LABEL="Password:"
    T_POS_TITLE="Ambrosia POS App"
    T_POS_HINT="Scan to open the app."
    T_SUPPORT_TITLE="Support"
    T_SUPPORT_TEXT="Scan to join our <b>Telegram</b> support chat."
    T_SUPPORT_NOTE="Requires a Telegram account."
    T_STEP_5_PRE="Open the camera app and <b>scan the QR code &rarr;</b>"
    T_STEP_6_TEMPLATE='Your browser will warn that the connection is <b>"Not private"</b>. This is expected on a local network and <b>safe here</b>. Tap <b>Advanced</b> (or <b>Show details</b> on Safari), then <b>Proceed to %s.local</b> / <b>Continue</b> / <b>Accept the Risk</b> (wording varies by browser).'
    T_STEP_7_PRE="Create your <b>admin account</b> in the setup wizard. <em>Write down your password.</em>"
    T_SSH_TITLE="SSH access"
    T_SSH_SUBTITLE="(for advanced use or use outside of the kermés):"
    T_PASSWORD_LABEL="Password:"
    T_CHANGE_PASSWORD="Change this password on first SSH login by running <code>passwd</code>."
    T_TROUBLE_HEAD="Trouble?"
    T_TROUBLE_BODY_TEMPLATE='If the QR doesn&rsquo;t open, type the URL by hand. If the page won&rsquo;t load, make sure your phone is on <b>%s</b>.'
    T_SUPPORT_HEAD="Need help?"
    T_SUPPORT_L1="Scan to join our"
    T_SUPPORT_L2="support chat."
fi

# HTML-escape a string so it can be safely interpolated into element bodies
html_escape() {
    local s="$1"
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    s="${s//\"/&quot;}"
    printf '%s' "$s"
}

SSID_HTML=$(html_escape "$SSID")

# Escape a string for embedding inside the WIFI: URI. The spec requires
# backslash-escaping the five special chars : ; , " \.
wifi_uri_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//:/\\:}"
    s="${s//;/\\;}"
    s="${s//,/\\,}"
    printf '%s' "$s"
}

# Pre-render the Wi-Fi QR (one-shot, identical on every card).
# Shape: WIFI:T:<auth>;S:<ssid>;P:<pass>;;
WIFI_BLOCK=""
if [[ -z "$WIFI_PASSWORD" ]]; then
    # No Wi-Fi QR -> no arrow suffix pointing at a non-existent block
    T_STEP_4_WIFI_SUFFIX=""
fi
if [[ -n "$WIFI_PASSWORD" ]]; then
    WIFI_AUTH_UP=$(echo "$WIFI_AUTH" | tr '[:lower:]' '[:upper:]')
    case "$WIFI_AUTH_UP" in WPA|WPA2|WPA3) WIFI_AUTH_UP="WPA" ;; WEP) ;; NOPASS|NONE) WIFI_AUTH_UP="nopass" ;; esac
    WIFI_URI="WIFI:T:${WIFI_AUTH_UP};S:$(wifi_uri_escape "$SSID");P:$(wifi_uri_escape "$WIFI_PASSWORD");;"
    WIFI_QR=$(qrencode -t SVG -m 0 -s 3 -o - "$WIFI_URI" | sed -n '/<svg/,/<\/svg>/p')
    WIFI_PASS_HTML=$(html_escape "$WIFI_PASSWORD")
    # Inline block rendered inside step 4
    WIFI_INLINE=$(cat <<WIFI
          <div class="qr-box wifi-block">
            <div class="qr-box-title">${T_WIFI_TITLE}</div>
            <div class="wifi-inner">
              <div class="wifi-qr">${WIFI_QR}</div>
              <div class="wifi-text">
                <div>${T_WIFI_NAME_LABEL} <b>${SSID_HTML}</b></div>
                <div>${T_WIFI_PASS_LABEL} <code>${WIFI_PASS_HTML}</code></div>
                <div class="wifi-hint">${T_WIFI_SCAN_HINT}</div>
              </div>
            </div>
          </div>
WIFI
)
fi

# Pre-render the support QR once (same on every card)
SUPPORT_BLOCK=""
if [[ -n "$SUPPORT_URL" ]]; then
    SUPPORT_QR=$(qrencode -t SVG -m 0 -s 3 -o - "$SUPPORT_URL" | sed -n '/<svg/,/<\/svg>/p')
    SUPPORT_URL_HTML=$(html_escape "$SUPPORT_URL")
    SUPPORT_BLOCK=$(cat <<SUPPORT
    <div class="qr-box support-block">
      <div class="qr-box-title">${T_SUPPORT_TITLE}</div>
      <div class="support-inner">
        <div class="support-qr">${SUPPORT_QR}</div>
        <div class="support-text">
          <div>${T_SUPPORT_TEXT}</div>
          <div class="support-url">${SUPPORT_URL_HTML}</div>
          <div class="support-note">${T_SUPPORT_NOTE}</div>
        </div>
      </div>
    </div>
SUPPORT
)
fi

mkdir -p "$(dirname "$OUT")"
{
cat <<HTML_HEAD
<!DOCTYPE html>
<html lang="${T_HTML_LANG}">
<head>
<meta charset="UTF-8">
<title>${T_TITLE}</title>
<style>
  @page { size: letter; margin: 0.4in; }
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; color: #111; }
  .page-note { font-size: 9pt; color: #888; margin: 0 0 0.15in 0; }
  .card {
    width: 7.7in;
    margin: 0 0 0.15in 0;
    padding: 0.25in 0.3in;
    border: 2px dashed #888;
    border-radius: 0.1in;
    box-sizing: border-box;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: baseline;
    border-bottom: 2px solid #000;
    padding-bottom: 0.06in;
    margin-bottom: 0.15in;
  }
  .header .name { font-size: 22pt; font-weight: 700; }
  .header .product { margin-left: auto; font-size: 11pt; color: #555; }
  .body {
    display: flex;
    flex: 1;
    gap: 0.35in;
  }
  .left { flex: 1.3; display: flex; flex-direction: column; min-width: 0; }
  .right {
    width: 2.6in;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .steps-title { font-size: 11pt; font-weight: 700; margin-bottom: 0.04in; }
  ol.steps {
    margin: 0;
    padding-left: 0.25in;
    font-size: 11pt;
    line-height: 1.4;
  }
  ol.steps li { margin-bottom: 0.03in; }
  ol.steps b { font-weight: 700; }
  /* Shared look for every QR-containing box */
  .qr-box {
    display: flex;
    flex-direction: column;
    padding: 0.06in 0.1in;
    background: #f4f4f4;
    border-radius: 0.05in;
    box-sizing: border-box;
  }
  .qr-box-title {
    font-size: 9pt;
    font-weight: 700;
    text-align: center;
    color: #333;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.03in;
    margin-bottom: 0.05in;
  }
  /* Wi-Fi block (row layout: QR + SSID/password) */
  .wifi-block { width: 2.5in; margin-bottom: 0.08in; }
  .wifi-inner { display: flex; align-items: center; gap: 0.1in; }
  .wifi-qr svg { width: 0.7in; height: 0.7in; display: block; }
  .wifi-text { font-size: 8.5pt; line-height: 1.3; }
  .wifi-text code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 8pt; }
  .wifi-text .wifi-hint { font-size: 7pt; color: #666; margin-top: 0.02in; }
  /* Main POS block (column layout: big QR + URL) */
  .pos-block { width: 2.5in; align-items: center; margin-bottom: 0.1in; }
  .pos-block .qr { margin-top: 0.02in; }
  .pos-block .qr svg { width: 1.8in; height: 1.8in; display: block; }
  .pos-block .url {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 9.5pt;
    text-align: center;
    white-space: nowrap;
    margin-top: 0.06in;
  }
  .pos-block .qr-hint { font-size: 7pt; color: #666; text-align: center; margin-top: 0.02in; }
  .footer {
    margin-top: auto;
    display: grid;
    grid-template-columns: 2.5in 1fr 2.5in;
    gap: 0.15in;
    font-size: 8pt;
    color: #555;
    border-top: 1px solid #ccc;
    padding-top: 0.12in;
    line-height: 1.3;
  }
  /* Plain-text columns get a matching top pad so their first line sits on
     the same baseline as the boxed support column's first line (title). */
  .footer .admin,
  .footer .help { padding-top: 0.06in; }
  .footer .admin { min-width: 0; overflow: hidden; }
  .footer .admin .lbl { color: #888; }
  .footer .admin code,
  .footer .admin .val {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    color: #111;
    font-size: 7pt;
    white-space: nowrap;
  }
  .footer .help { min-width: 0; }
  /* Support block (row layout: small QR + text). Fixed width so it aligns
     with the main POS QR box above it. */
  .support-block { align-self: flex-start; width: 2.5in; box-sizing: border-box; }
  .support-inner { display: flex; align-items: center; gap: 0.1in; }
  .support-qr svg { width: 0.85in; height: 0.85in; display: block; }
  .support-text { font-size: 8pt; line-height: 1.3; color: #111; min-width: 0; }
  .support-url {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 7pt;
    color: #333;
    word-break: break-all;
    margin-top: 0.03in;
  }
  .support-note { font-size: 7pt; color: #666; margin-top: 0.03in; }
  @media print { .page-note { display: none; } }
</style>
</head>
<body>
<p class="page-note">${T_PAGE_NOTE}</p>
HTML_HEAD

while read -r NAME PASSWORD; do
    [[ -z "$NAME" || "$NAME" =~ ^# ]] && continue
    URL="https://${NAME}.local/"
    NAME_H=$(html_escape "$NAME")
    PW_H=$(html_escape "$PASSWORD")
    URL_H=$(html_escape "$URL")
    QR_SVG=$(qrencode -t SVG -m 0 -s 4 -o - "$URL" | sed -n '/<svg/,/<\/svg>/p')
    # Interpolate per-card hostname into the browser-warning step and the
    # trouble paragraph (keeps translations centralized above).
    STEP_6_TEXT=$(printf "$T_STEP_6_TEMPLATE" "$NAME_H")
    TROUBLE_TEXT=$(printf "$T_TROUBLE_BODY_TEMPLATE" "$SSID_HTML")
    cat <<HTML_CARD
<div class="card">
  <div class="header">
    <div class="name">${NAME_H}</div>
    <div class="product">${T_PRODUCT}</div>
  </div>
  <div class="body">
    <div class="left">
      <div class="steps-title">${T_STEPS_TITLE}</div>
      <ol class="steps">
        <li>${T_STEP_1_PRE}</li>
        <li>${T_STEP_2_PRE}</li>
        <li>${T_STEP_3_PRE}</li>
        <li>${T_STEP_4_PRE} <b>${SSID_HTML}</b>${T_STEP_4_WIFI_SUFFIX}</li>
        <li>${T_STEP_5_PRE}</li>
        <li>${STEP_6_TEXT}</li>
        <li>${T_STEP_7_PRE}</li>
      </ol>
    </div>
    <div class="right">
${WIFI_INLINE}
      <div class="qr-box pos-block">
        <div class="qr-box-title">${T_POS_TITLE}</div>
        <div class="qr">${QR_SVG}</div>
        <div class="url">${URL_H}</div>
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="admin">
      <div><span class="lbl"><b>${T_SSH_TITLE}</b> ${T_SSH_SUBTITLE}</span></div>
      <div><code>ssh ${NAME_H}@${NAME_H}.local</code></div>
      <div><span class="lbl">${T_PASSWORD_LABEL}</span> <span class="val">${PW_H}</span></div>
      <div class="lbl">${T_CHANGE_PASSWORD}</div>
    </div>
    <div class="help">
      <b>${T_TROUBLE_HEAD}</b> ${TROUBLE_TEXT}
    </div>
${SUPPORT_BLOCK}
  </div>
</div>
HTML_CARD
done < <(sort -V -k1,1 "$LOG")

cat <<'HTML_TAIL'
</body>
</html>
HTML_TAIL
} > "$OUT"

echo "Wrote $(grep -c '<div class="card"' "$OUT") card(s) to $OUT"
echo "Wi-Fi SSID baked into cards: $SSID"
echo "Open in a browser and Ctrl+P to print."
