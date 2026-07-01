#!/bin/bash
# Generate a printable take-home instruction sheet (letter paper, 3-4 pages)
# for vendors who want to use their Ambrosia unit at home after the kermés.
# Covers three Wi-Fi reconfiguration methods: phone+captive-portal (default),
# HDMI+keyboard, and USB-Ethernet.
#
# Usage: ./generate-take-home.sh [options]
#   --lang <code>  en (default) or es (Mexican Spanish)
#   --out <path>   output HTML file (default: ~/ambrosia-take-home-<lang>.html)

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

CARD_LANG="en"
OUT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --lang) CARD_LANG="$2"; shift 2 ;;
        --out)  OUT="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,10p' "$0" | sed 's|^# *||'
            exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

case "$CARD_LANG" in
    es|es-mx|es-MX|es_MX|es_mx) CARD_LANG="es" ;;
    en|en-us|en-US|en_US)       CARD_LANG="en" ;;
    *) echo "Unknown language: $CARD_LANG (supported: en, es)" >&2; exit 1 ;;
esac

if [[ -z "$OUT" ]]; then
    OUT="$REPO_ROOT/out/ambrosia-take-home-${CARD_LANG}.html"
fi

if [[ "$CARD_LANG" == "es" ]]; then
    HTML_LANG="es-MX"
    T_TITLE="Llévate tu unidad Ambrosia a casa"
    T_INTRO='Tu OrangePi se configuró en la kermés, así que está conectada al Wi-Fi de la kermés. Para usarla en casa (u otro lugar) necesitas decirle el nombre y contraseña de tu Wi-Fi. Elige <b>uno</b> de los tres métodos según el equipo que tengas a la mano. <b>El Método 1 es el más fácil</b> &mdash; solo necesitas tu teléfono.'
    T_REPLACE='El nombre de tu unidad está en la tarjeta impresa que recibiste (por ejemplo <code>ambrosia-opi-3</code>). Sustituye <code>TU-UNIDAD</code> en los ejemplos por el nombre que aparezca en tu tarjeta. Tu contraseña SSH también está en la tarjeta.'
    T_M1="Método 1: Teléfono + Wi-Fi de configuración"
    T_M1_SUB="más fácil, sin equipo extra"
    T_M1_NEEDS="<b>Necesitas:</b> solo tu teléfono."
    T_M1_STEPS='<p>Cuando la OrangePi enciende y no encuentra una red Wi-Fi conocida, levanta su propia red de configuración. Te conectas a esa red desde el teléfono, eliges tu Wi-Fi de la lista, escribes la contraseña y listo.</p>
    <ol>
      <li>Conecta la corriente a la OrangePi y espera unos 60 segundos.</li>
      <li>En tu teléfono, abre los ajustes de Wi-Fi y conéctate a <b><code>TU-UNIDAD-setup</code></b> (red abierta, sin contraseña).</li>
      <li>El teléfono debería abrir la página de configuración automáticamente. Si no aparece, abre Chrome o Safari y entra a <code>http://10.42.1.1</code>.</li>
      <li>La página muestra las redes Wi-Fi que la OrangePi puede ver. Toca tu Wi-Fi de casa (o escribe el nombre si está oculta), luego escribe la contraseña &mdash; toca <b>Mostrar</b> para verificar lo que escribiste. Toca <b>Conectar</b>.</li>
      <li>En la siguiente pantalla, lee los pasos y luego toca <b>Copiar dirección y terminar</b>. Esto copia la dirección del POS al portapapeles, apaga la red de configuración, y tu teléfono se reconecta solo a tu Wi-Fi de casa.</li>
      <li>Abre Chrome o Safari, pega la dirección en la barra y entrarás al POS.</li>
    </ol>
    <div class="note">Si la página de configuración no aparece sola al unirte a <code>TU-UNIDAD-setup</code>, espera 5-10 segundos y abre <code>http://10.42.1.1</code> manualmente en el navegador.</div>'
    T_M2="Método 2: HDMI + teclado USB"
    T_M2_SUB="no requiere otra computadora"
    T_M2_NEEDS="<b>Necesitas:</b> una TV o monitor con HDMI, un cable mini-HDMI a HDMI y un teclado USB."
    T_M2_STEPS='<ol>
      <li>Apaga la OrangePi (desconecta el cable USB-C).</li>
      <li>Conéctala a tu TV/monitor con el cable mini-HDMI y conecta un teclado USB.</li>
      <li>Vuelve a conectar la corriente y espera unos 60 segundos hasta que aparezca la pantalla de inicio.</li>
      <li>Cuando aparezca <code>TU-UNIDAD login:</code> en la pantalla, escribe el nombre de tu unidad (de la tarjeta) y presiona Enter, luego tu contraseña y Enter.</li>
      <li>Conéctate a tu Wi-Fi de casa con:
        <pre>sudo nmcli --ask device wifi connect "NOMBRE-DE-TU-WIFI"</pre>
        Te pedirá tu contraseña de sudo (la misma de la tarjeta) y luego la contraseña de tu Wi-Fi de casa.
      </li>
      <li>Verifica que funcionó:
        <pre>nmcli device status</pre>
        La línea de <code>wlan0</code> debe decir <b>connected</b> con el nombre de tu Wi-Fi a la derecha.
      </li>
      <li>Apaga con <code>sudo poweroff</code>, desconecta el HDMI y el teclado, mueve la OrangePi al lugar donde la vayas a usar. Al conectar la corriente se conectará sola a tu Wi-Fi de casa.</li>
    </ol>'
    T_M3="Método 3: Cable Ethernet USB"
    T_M3_SUB="sin Wi-Fi"
    T_M3_NEEDS="<b>Necesitas:</b> un adaptador USB-C a Ethernet, un cable Ethernet y tu router con un puerto LAN libre."
    T_M3_STEPS='<p>Si prefieres simplemente conectar la OrangePi al router y olvidarte del Wi-Fi, este es el camino más rápido. Una vez en la red cableada, cualquier dispositivo en tu Wi-Fi de casa puede acceder a ella.</p>
    <ol>
      <li>Conecta el adaptador USB-C a Ethernet a la OrangePi, y un cable Ethernet del adaptador al router.</li>
      <li>Conecta la corriente y espera unos 60 segundos.</li>
      <li>Desde cualquier dispositivo en tu red de casa (teléfono, laptop), abre <code>https://TU-UNIDAD.local/</code> en el navegador. Acepta la advertencia del certificado (es el certificado autofirmado de la unidad &mdash; igual que en la kermés). Listo, ya estás en el POS.</li>
    </ol>
    <div class="note">Si <code>TU-UNIDAD.local</code> no resuelve, busca la IP de la OrangePi en la página de "dispositivos conectados" de tu router y usa <code>https://192.168.x.y/</code>.</div>
    <p style="margin-top:0.1in;">Puedes dejar la unidad en Ethernet de forma permanente. Si después prefieres Wi-Fi, desconecta el cable Ethernet y la unidad arrancará con el AP de configuración del Método 1 al volver a encenderla.</p>'
    T_FIND_TITLE="Cómo encontrar el nombre y contraseña de tu Wi-Fi"
    T_FIND_INTRO="Si no sabes el nombre (SSID) o contraseña de tu Wi-Fi de casa, estos son los lugares más comunes donde encontrarlos:"
    T_FIND_LIST='<ol>
      <li><b>Calcomanía del router.</b> La mayoría de los routers traen el nombre de la red y la contraseña de fábrica impresos en una calcomanía en la parte de abajo o atrás. Busca etiquetas como "WiFi Name", "SSID" o "Nombre de red", y "Password", "WPA Key" o "Contraseña".</li>
      <li><b>Un teléfono que ya está conectado a esa red.</b>
        <ul>
          <li><b>Android (10+):</b> Ajustes &rarr; Red e internet &rarr; Internet &rarr; toca tu Wi-Fi &rarr; Compartir &rarr; muestra el código QR o revela la contraseña.</li>
          <li><b>iOS (16+):</b> Ajustes &rarr; Wi-Fi &rarr; toca la (i) junto a tu red &rarr; toca Contraseña para verla.</li>
        </ul>
      </li>
      <li><b>App o portal de tu proveedor de internet.</b> Totalplay, Telmex, Izzi y Megacable te permiten ver (y cambiar) las credenciales del Wi-Fi desde su app o portal en línea.</li>
      <li><b>Página de administración del router.</b> Desde un dispositivo ya conectado a tu Wi-Fi, abre <code>http://192.168.1.1</code> o <code>http://192.168.100.1</code> en un navegador. Inicia sesión con las credenciales de admin (a veces también están en la calcomanía) y busca la sección de Wireless o Wi-Fi.</li>
    </ol>
    <p>¿Sigues atorado? Pregunta en el chat de soporte de Telegram &mdash; te ayudamos a encontrarlos.</p>'
    T_TROUBLE_TITLE="Solución de problemas"
    T_TROUBLE='<ul>
      <li><b><code>TU-UNIDAD-setup</code> no aparece en el listado de Wi-Fi.</b> Espera 60 segundos completos después de encender, y vuelve a buscar. Si aún no aparece, puede que se haya conectado a una red conocida — apaga y enciende en un lugar fuera del alcance de cualquier Wi-Fi que conozca.</li>
      <li><b>La página de configuración no aparece al unirte a <code>TU-UNIDAD-setup</code>.</b> Abre Chrome o Safari y entra a <code>http://10.42.1.1</code> manualmente.</li>
      <li><b>Escribiste mal la contraseña del Wi-Fi.</b> El AP de configuración vuelve a aparecer si falla el intento — solo vuelve a unirte a <code>TU-UNIDAD-setup</code> y prueba otra vez. (Si usaste el Método 2 o 3: <code>sudo nmcli connection delete "NOMBRE-DE-TU-WIFI"</code> y luego repite el comando connect.)</li>
      <li><b>Sigue conectado al Wi-Fi de la kermés cuando no quieres.</b> En casa el Wi-Fi de la kermés no está al alcance, así que no se conectará solo — basta con agregar tu Wi-Fi de casa y la unidad usará la que esté disponible.</li>
      <li><b>Olvidaste la contraseña o te bloqueaste.</b> Escríbenos al chat de soporte de Telegram (QR en tu tarjeta).</li>
      <li><b>Nada resuelve ni funciona.</b> Apaga la unidad, tráela al organizador de la kermés o pide ayuda en Telegram — podemos reimaginar la tarjeta por ti.</li>
    </ul>'
    T_OUTRO='Cuando estés conectado, abre la app del POS en <code>https://TU-UNIDAD.local/</code> desde cualquier dispositivo en tu Wi-Fi de casa — igual que en la kermés, con la misma advertencia del navegador que hay que aceptar.'
else
    HTML_LANG="en"
    T_TITLE="Taking your Ambrosia unit home"
    T_INTRO='Your OrangePi was set up at the kermés, so it is configured to connect to the kermés Wi-Fi. To use it at home (or at another location), you need to tell it about your home Wi-Fi network. Pick <b>one</b> of the three methods below &mdash; whichever matches the hardware you have handy. <b>Method 1 is the easiest</b> &mdash; it only needs your phone.'
    T_REPLACE='Your unit name is on the printed card that came with the OrangePi (e.g. <code>ambrosia-opi-3</code>). Replace <code>YOUR-UNIT</code> in the examples below with the actual name on your card. Your SSH password is also on the card.'
    T_M1="Method 1: Phone + setup Wi-Fi"
    T_M1_SUB="easiest, no extra hardware"
    T_M1_NEEDS="<b>You'll need:</b> just your phone."
    T_M1_STEPS='<p>When the OrangePi boots and cannot find a Wi-Fi it knows, it broadcasts its own setup network. You join that network from your phone, pick your home Wi-Fi from a list, type the password, and you are done.</p>
    <ol>
      <li>Plug power into the OrangePi and wait about 60 seconds.</li>
      <li>On your phone, open Wi-Fi settings and connect to <b><code>YOUR-UNIT-setup</code></b> (open network, no password).</li>
      <li>Your phone should automatically open the setup page. If nothing pops up, open Chrome or Safari and go to <code>http://10.42.1.1</code>.</li>
      <li>The page lists Wi-Fi networks the OrangePi can see. Tap your home Wi-Fi (or type the name if it is hidden), then enter the password &mdash; tap <b>Show</b> to verify what you typed. Tap <b>Connect</b>.</li>
      <li>On the next page, read the steps and then tap <b>Copy address and finish</b>. This copies the POS address to your clipboard, shuts down the setup network, and your phone reconnects to your home Wi-Fi.</li>
      <li>Open Chrome or Safari, paste the address into the URL bar, and you are at the POS.</li>
    </ol>
    <div class="note">If the captive page does not pop up after you join <code>YOUR-UNIT-setup</code>, give it 5-10 seconds and then open <code>http://10.42.1.1</code> in a browser manually.</div>'
    T_M2="Method 2: HDMI + USB keyboard"
    T_M2_SUB="no other computer required"
    T_M2_NEEDS="<b>You'll need:</b> a TV or monitor with HDMI, a mini-HDMI to HDMI cable, and a USB keyboard."
    T_M2_STEPS='<ol>
      <li>Power off the OrangePi (unplug the USB-C cable).</li>
      <li>Connect the OrangePi to your TV/monitor with the mini-HDMI cable, and plug in a USB keyboard.</li>
      <li>Plug the power back in and wait about 60 seconds for the boot screen.</li>
      <li>When you see <code>YOUR-UNIT login:</code> on the screen, type your unit name (from the card) and press Enter, then your password and Enter.</li>
      <li>Connect to your home Wi-Fi by typing:
        <pre>sudo nmcli --ask device wifi connect "YOUR-HOME-WIFI-NAME"</pre>
        It will ask for your sudo password (the one on the card) and then your home Wi-Fi password.
      </li>
      <li>Confirm it worked:
        <pre>nmcli device status</pre>
        The <code>wlan0</code> line should say <b>connected</b> with your home Wi-Fi name on the right.
      </li>
      <li>Power off (<code>sudo poweroff</code>), unplug the HDMI cable and keyboard, and move the OrangePi to wherever you want to use it. Plug power back in &mdash; it will auto-connect to your home Wi-Fi from now on.</li>
    </ol>'
    T_M3="Method 3: USB Ethernet cable"
    T_M3_SUB="skip Wi-Fi entirely"
    T_M3_NEEDS="<b>You'll need:</b> a USB-C to Ethernet adapter, an Ethernet cable, and your home router with a free LAN port."
    T_M3_STEPS='<p>If you would rather just plug the OrangePi into your router and skip Wi-Fi setup altogether, this is the fastest option. Once it is on the wired network, every device on your home Wi-Fi can reach it.</p>
    <ol>
      <li>Plug the USB-C Ethernet adapter into the OrangePi, then an Ethernet cable from the adapter to your router.</li>
      <li>Plug in power and wait about 60 seconds.</li>
      <li>From any device on your home network (phone, laptop), open <code>https://YOUR-UNIT.local/</code> in a browser. Click through the certificate warning (it is the unit&apos;s self-signed cert &mdash; same as at the kermés). You are at the POS.</li>
    </ol>
    <div class="note">If <code>YOUR-UNIT.local</code> does not resolve, find the OrangePi&apos;s IP in your router&apos;s "connected devices" admin page and use <code>https://192.168.x.y/</code> instead.</div>
    <p style="margin-top:0.1in;">You can leave the unit on Ethernet permanently. If you would later prefer Wi-Fi, unplug the Ethernet cable and the unit will boot into Method 1&apos;s setup AP next time you power-cycle it.</p>'
    T_FIND_TITLE="Finding your Wi-Fi name and password"
    T_FIND_INTRO="If you do not know your home Wi-Fi name (SSID) or password, here are the common places to look:"
    T_FIND_LIST='<ol>
      <li><b>Sticker on the router.</b> Most home routers have the default network name and password printed on a sticker on the bottom or back. Look for labels like "WiFi Name", "SSID", or "Network Name", and "Password", "WPA Key", or "Wi-Fi Password".</li>
      <li><b>A phone that is already connected.</b>
        <ul>
          <li><b>Android (10+):</b> Settings &rarr; Network &amp; Internet &rarr; Internet &rarr; tap your Wi-Fi &rarr; Share &rarr; scan the QR or reveal the password.</li>
          <li><b>iOS (16+):</b> Settings &rarr; Wi-Fi &rarr; tap the (i) next to your network &rarr; tap Password to reveal.</li>
        </ul>
      </li>
      <li><b>Your ISP app or account portal.</b> Providers like Totalplay, Telmex, Izzi, and Megacable let you view (and change) your Wi-Fi credentials in their mobile app or online account.</li>
      <li><b>Router admin page.</b> From a device already on your Wi-Fi, open <code>http://192.168.1.1</code> or <code>http://192.168.100.1</code> in a browser. Log in with admin credentials (often also on the router sticker) and look under Wireless / Wi-Fi settings.</li>
    </ol>
    <p>Still stuck? Ask in the Telegram support chat &mdash; we can walk you through it.</p>'
    T_TROUBLE_TITLE="Troubleshooting"
    T_TROUBLE='<ul>
      <li><b><code>YOUR-UNIT-setup</code> does not appear in your phone&apos;s Wi-Fi list.</b> Wait a full 60 seconds after powering on, then re-scan. If still nothing, the unit may have auto-connected to a known network &mdash; power-cycle it somewhere out of range of any Wi-Fi it knows.</li>
      <li><b>Setup page does not pop up after joining <code>YOUR-UNIT-setup</code>.</b> Open Chrome or Safari and go to <code>http://10.42.1.1</code> manually.</li>
      <li><b>Wrong Wi-Fi password typed.</b> The setup AP comes back up after a failed attempt &mdash; just rejoin <code>YOUR-UNIT-setup</code> and try again. (If you used Method 2 or 3: <code>sudo nmcli connection delete "YOUR-HOME-WIFI-NAME"</code> then repeat the connect command.)</li>
      <li><b>Still on the kermés Wi-Fi when you do not want to be.</b> At home the kermés Wi-Fi is not in range so it will not auto-connect &mdash; just add your home one and the unit will prefer whichever is available.</li>
      <li><b>Forgot your password or locked yourself out.</b> Reach out in the Telegram support chat (QR on your card).</li>
      <li><b>Nothing resolves and nothing works.</b> Power off, bring the unit to the kermés organizer or ping support on Telegram &mdash; we can reimage it for you.</li>
    </ul>'
    T_OUTRO='After you are connected, access the POS UI at <code>https://YOUR-UNIT.local/</code> from any device on your home Wi-Fi &mdash; same as at the kermés, same cert warning to click through.'
fi

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<HTML
<!DOCTYPE html>
<html lang="${HTML_LANG}">
<head>
<meta charset="UTF-8">
<title>${T_TITLE}</title>
<style>
  @page { size: letter; margin: 0.7in; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #111;
    max-width: 7.1in;
  }
  h1 {
    font-size: 22pt;
    margin: 0 0 0.15in 0;
    padding-bottom: 0.08in;
    border-bottom: 3px solid #000;
  }
  h2 {
    font-size: 15pt;
    margin: 0.3in 0 0.08in 0;
    padding: 0.06in 0.1in;
    background: #f0f0f0;
    border-left: 4px solid #444;
    page-break-after: avoid;
  }
  h2 .sub { font-size: 10pt; font-weight: 400; color: #555; margin-left: 0.1in; }
  h3 { font-size: 12pt; margin: 0.2in 0 0.05in 0; }
  p { margin: 0 0 0.1in 0; }
  ol, ul { margin: 0.05in 0; padding-left: 0.3in; }
  ol li, ul li { margin-bottom: 0.08in; }
  pre {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 0.04in;
    padding: 0.08in 0.1in;
    margin: 0.06in 0;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 10pt;
    white-space: pre-wrap;
    word-break: break-word;
  }
  code {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 10.5pt;
    background: #f4f4f4;
    padding: 0 0.03in;
    border-radius: 0.02in;
  }
  .note {
    font-size: 10pt;
    color: #555;
    background: #fafafa;
    border-left: 3px solid #bbb;
    padding: 0.05in 0.1in;
    margin: 0.06in 0;
  }
  .intro { margin-bottom: 0.15in; }
  .divider {
    border: none;
    border-top: 1px dashed #aaa;
    margin: 0.2in 0;
  }
  /* Keep each method on its own page if possible */
  .section { page-break-inside: avoid; }
  @media print { h2 { page-break-before: always; } h2:first-of-type { page-break-before: auto; } }
</style>
</head>
<body>
  <h1>${T_TITLE}</h1>
  <p class="intro">${T_INTRO}</p>
  <p class="intro">${T_REPLACE}</p>

  <div class="section">
    <h2>${T_M1} <span class="sub">(${T_M1_SUB})</span></h2>
    <p>${T_M1_NEEDS}</p>
    ${T_M1_STEPS}
  </div>

  <div class="section">
    <h2>${T_M2} <span class="sub">(${T_M2_SUB})</span></h2>
    <p>${T_M2_NEEDS}</p>
    ${T_M2_STEPS}
  </div>

  <div class="section">
    <h2>${T_M3} <span class="sub">(${T_M3_SUB})</span></h2>
    <p>${T_M3_NEEDS}</p>
    ${T_M3_STEPS}
  </div>

  <div class="section">
    <h2>${T_FIND_TITLE}</h2>
    <p>${T_FIND_INTRO}</p>
    ${T_FIND_LIST}
  </div>

  <div class="section">
    <h2>${T_TROUBLE_TITLE}</h2>
    ${T_TROUBLE}
    <p style="margin-top: 0.15in;">${T_OUTRO}</p>
  </div>
</body>
</html>
HTML

echo "Wrote $OUT"
echo "Open in a browser and Ctrl+P to print."
