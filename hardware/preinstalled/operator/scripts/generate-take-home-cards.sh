#!/bin/bash
# Generate compact per-unit take-home cards (one per unit) with the
# captive-portal Wi-Fi setup flow only — meant to be cut out and slipped
# into the box that goes home with each vendor. Mirrors the layout of
# generate-vendor-cards.sh so the two cards feel like a set.
#
# Usage: ./generate-take-home-cards.sh [options]
#   --support-url <url>  Telegram (or other) support invite URL — adds a small
#                        QR + text block in the footer.
#   --lang <code>        Card language: en (default) or es (Mexican Spanish).
#   --log <path>         password log path (default: ~/ambrosia-fleet-passwords.txt)
#   --out <path>         output HTML file (default: ~/ambrosia-take-home-cards.html)

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

SUPPORT_URL=""
CARD_LANG="en"
LOG="$HOME/ambrosia-fleet-passwords.txt"
OUT="$REPO_ROOT/out/ambrosia-take-home-cards.html"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --support-url) SUPPORT_URL="$2"; shift 2 ;;
        --lang)        CARD_LANG="$2"; shift 2 ;;
        --log)         LOG="$2"; shift 2 ;;
        --out)         OUT="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,13p' "$0" | sed 's|^# *||'
            exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

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

if [[ "$CARD_LANG" == "es" ]]; then
    T_HTML_LANG="es-MX"
    T_TITLE="Tarjetas para llevar a casa — Ambrosia"
    T_PAGE_NOTE="Imprime en papel tamaño carta. Corta por las líneas punteadas y entrega una tarjeta a cada vendedor."
    T_PRODUCT="Ambrosia POS — Llévate a casa"
    T_INTRO="Cuando llegues a casa, tu unidad no encontrará el Wi-Fi de la kermés y abrirá su propia red de configuración. Sigue estos pasos para enseñarle tu Wi-Fi de casa:"
    T_STEPS_TITLE="Pasos"
    T_STEP_1="Conecta la corriente y espera unos <b>60 segundos</b>."
    T_STEP_2_PRE="Conecta tu teléfono al Wi-Fi"
    T_STEP_2_NOTE="(red abierta, sin contraseña)"
    T_STEP_3="Debe abrirse sola la <b>página de configuración</b>. Si no, abre <code>http://10.42.1.1</code> en Chrome o Safari."
    T_STEP_4="Toca tu Wi-Fi de casa de la lista (o escribe el nombre si está oculta), escribe la contraseña — toca <b>Mostrar</b> para verificar — y toca <b>Conectar</b>."
    T_STEP_5="Toca <b>Copiar dirección y terminar</b>. La red de configuración se cierra y tu teléfono vuelve solo a tu Wi-Fi de casa."
    T_STEP_6="Abre Chrome o Safari, <b>pega la dirección</b> en la barra. ¡Listo, ya estás en el POS!"
    T_AP_LABEL="Wi-Fi de configuración"
    T_POS_TITLE="Ambrosia POS"
    T_POS_HINT="O escanea para abrir directo después."
    T_TROUBLE_HEAD="¿Problemas?"
    T_TROUBLE_BODY="Si no aparece <code>%s-setup</code> en la lista del teléfono, espera 60 seg y vuelve a buscar. Si no abre la página de configuración, escribe <code>http://10.42.1.1</code> a mano."
    T_ETHERNET_HEAD="¿Tienes adaptador Ethernet USB-C?"
    T_ETHERNET_BODY="Conéctalo al router con un cable Ethernet, espera 60 seg, y entra directo a <code>%s</code> desde cualquier dispositivo en tu Wi-Fi de casa. No necesitas hacer nada más."
    T_SUPPORT_TITLE="Soporte"
    T_SUPPORT_TEXT="Escanea para unirte al chat de soporte en <b>Telegram</b>."
    T_SUPPORT_NOTE="Requiere cuenta de Telegram."
    T_SSH_TITLE="Acceso SSH"
    T_SSH_SUBTITLE="(solo para uso avanzado):"
    T_PASSWORD_LABEL="Contraseña:"
    T_CHANGE_PASSWORD="Cambia esta contraseña al iniciar sesión SSH por primera vez con el comando <code>passwd</code>."
else
    T_HTML_LANG="en"
    T_TITLE="Take-home cards — Ambrosia"
    T_PAGE_NOTE="Print on letter paper. Cut along the dashed lines and hand one card to each vendor."
    T_PRODUCT="Ambrosia POS — Take home"
    T_INTRO="When you get home, your unit won&rsquo;t find the kermés Wi-Fi and will broadcast its own setup network instead. Follow these steps to teach it your home Wi-Fi:"
    T_STEPS_TITLE="Steps"
    T_STEP_1="Plug in power and wait about <b>60 seconds</b>."
    T_STEP_2_PRE="On your phone, join the Wi-Fi"
    T_STEP_2_NOTE="(open network, no password)"
    T_STEP_3="The <b>setup page</b> should open by itself. If it doesn&rsquo;t, open <code>http://10.42.1.1</code> in Chrome or Safari."
    T_STEP_4="Tap your home Wi-Fi from the list (or type the name if it&rsquo;s hidden), enter the password — tap <b>Show</b> to verify — and tap <b>Connect</b>."
    T_STEP_5="Tap <b>Copy address and finish</b>. The setup network closes and your phone reconnects to your home Wi-Fi."
    T_STEP_6="Open Chrome or Safari, <b>paste the address</b> into the URL bar. You&rsquo;re at the POS!"
    T_AP_LABEL="Setup Wi-Fi"
    T_POS_TITLE="Ambrosia POS"
    T_POS_HINT="Or scan to open directly afterward."
    T_TROUBLE_HEAD="Trouble?"
    T_TROUBLE_BODY="If <code>%s-setup</code> doesn&rsquo;t show up in your phone&rsquo;s Wi-Fi list, wait 60 sec and rescan. If the setup page doesn&rsquo;t open, type <code>http://10.42.1.1</code> manually."
    T_ETHERNET_HEAD="Got a USB-C Ethernet adapter?"
    T_ETHERNET_BODY="Plug it into your router with an Ethernet cable, wait 60 sec, and visit <code>%s</code> from any device on your home Wi-Fi. Nothing else to do."
    T_SUPPORT_TITLE="Support"
    T_SUPPORT_TEXT="Scan to join our <b>Telegram</b> support chat."
    T_SUPPORT_NOTE="Requires a Telegram account."
    T_SSH_TITLE="SSH access"
    T_SSH_SUBTITLE="(advanced use only):"
    T_PASSWORD_LABEL="Password:"
    T_CHANGE_PASSWORD="Change this password on first SSH login by running <code>passwd</code>."
fi

html_escape() {
    local s="$1"
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    s="${s//\"/&quot;}"
    printf '%s' "$s"
}

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
    margin-bottom: 0.12in;
  }
  .header .name { font-size: 22pt; font-weight: 700; }
  .header .product { margin-left: auto; font-size: 11pt; color: #555; }
  .intro { font-size: 10pt; color: #333; margin: 0 0 0.1in 0; }
  .body { display: flex; flex: 1; gap: 0.35in; }
  .left { flex: 1.4; display: flex; flex-direction: column; min-width: 0; }
  .right { width: 2.6in; display: flex; flex-direction: column; align-items: center; }
  .steps-title { font-size: 11pt; font-weight: 700; margin-bottom: 0.04in; }
  ol.steps { margin: 0; padding-left: 0.25in; font-size: 10pt; line-height: 1.35; }
  ol.steps li { margin-bottom: 0.04in; }
  ol.steps b { font-weight: 700; }
  ol.steps code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9pt; background: #f4f4f4; padding: 0 2px; border-radius: 2px; }
  .ap-callout {
    display: inline-block;
    background: #1a73e8;
    color: #fff;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-weight: 700;
    font-size: 11pt;
    padding: 2px 8px;
    border-radius: 4px;
    margin: 1px 2px;
    white-space: nowrap;
  }
  .ap-note { font-size: 8.5pt; color: #555; }
  .qr-box {
    display: flex;
    flex-direction: column;
    padding: 0.06in 0.1in;
    background: #f4f4f4;
    border-radius: 0.05in;
    box-sizing: border-box;
  }
  .qr-box-title {
    font-size: 9pt; font-weight: 700; text-align: center; color: #333;
    border-bottom: 1px solid #ccc; padding-bottom: 0.03in; margin-bottom: 0.05in;
  }
  /* Big "Setup Wi-Fi" callout — the most important per-card data point */
  .ap-block { width: 2.5in; align-items: center; margin-bottom: 0.1in; }
  .ap-block .big {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    word-break: break-all;
    margin: 0.04in 0;
  }
  .ap-block .sub { font-size: 8pt; color: #666; text-align: center; }
  /* POS QR block */
  .pos-block { width: 2.5in; align-items: center; margin-bottom: 0.08in; }
  .pos-block .qr svg { width: 1.4in; height: 1.4in; display: block; }
  .pos-block .url {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 9pt; text-align: center; white-space: nowrap; margin-top: 0.04in;
  }
  .pos-block .qr-hint { font-size: 7pt; color: #666; text-align: center; margin-top: 0.02in; }
  .footer {
    margin-top: auto;
    display: grid;
    grid-template-columns: 2.2in 1fr 2.5in;
    gap: 0.15in;
    font-size: 8pt; color: #555;
    border-top: 1px solid #ccc;
    padding-top: 0.1in;
    line-height: 1.35;
  }
  .footer .admin,
  .footer .help { padding-top: 0.04in; }
  .footer .admin { min-width: 0; overflow: hidden; }
  .footer .admin .lbl { color: #888; }
  .footer .admin code,
  .footer .admin .val {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    color: #111; font-size: 7pt; white-space: nowrap;
  }
  .footer .help b { color: #111; }
  .footer .help p { margin: 0 0 0.05in 0; }
  .support-block { align-self: flex-start; width: 2.5in; box-sizing: border-box; }
  .support-inner { display: flex; align-items: center; gap: 0.1in; }
  .support-qr svg { width: 0.85in; height: 0.85in; display: block; }
  .support-text { font-size: 8pt; line-height: 1.3; color: #111; min-width: 0; }
  .support-url { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 7pt; color: #333; word-break: break-all; margin-top: 0.03in; }
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
    AP_NAME="${NAME}-setup"
    NAME_H=$(html_escape "$NAME")
    PW_H=$(html_escape "$PASSWORD")
    URL_H=$(html_escape "$URL")
    AP_NAME_H=$(html_escape "$AP_NAME")
    QR_SVG=$(qrencode -t SVG -m 0 -s 4 -o - "$URL" | sed -n '/<svg/,/<\/svg>/p')
    TROUBLE_TEXT=$(printf "$T_TROUBLE_BODY" "$NAME_H")
    ETHERNET_TEXT=$(printf "$T_ETHERNET_BODY" "$URL_H")
    cat <<HTML_CARD
<div class="card">
  <div class="header">
    <div class="name">${NAME_H}</div>
    <div class="product">${T_PRODUCT}</div>
  </div>
  <p class="intro">${T_INTRO}</p>
  <div class="body">
    <div class="left">
      <div class="steps-title">${T_STEPS_TITLE}</div>
      <ol class="steps">
        <li>${T_STEP_1}</li>
        <li>${T_STEP_2_PRE} <span class="ap-callout">${AP_NAME_H}</span> <span class="ap-note">${T_STEP_2_NOTE}</span></li>
        <li>${T_STEP_3}</li>
        <li>${T_STEP_4}</li>
        <li>${T_STEP_5}</li>
        <li>${T_STEP_6}</li>
      </ol>
    </div>
    <div class="right">
      <div class="qr-box ap-block">
        <div class="qr-box-title">${T_AP_LABEL}</div>
        <div class="big">${AP_NAME_H}</div>
        <div class="sub">${T_STEP_2_NOTE}</div>
      </div>
      <div class="qr-box pos-block">
        <div class="qr-box-title">${T_POS_TITLE}</div>
        <div class="qr">${QR_SVG}</div>
        <div class="url">${URL_H}</div>
        <div class="qr-hint">${T_POS_HINT}</div>
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
      <p><b>${T_TROUBLE_HEAD}</b> ${TROUBLE_TEXT}</p>
      <p><b>${T_ETHERNET_HEAD}</b> ${ETHERNET_TEXT}</p>
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
echo "Open in a browser and Ctrl+P to print."
