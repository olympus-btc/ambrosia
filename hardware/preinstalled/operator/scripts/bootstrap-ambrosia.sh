#!/bin/bash
# Bootstrap a vanilla OrangePi Zero 2W into a ready-to-golden Ambrosia unit.
#
# Assumes:
#   - The Pi has been flashed with the vanilla Debian Bookworm server image
#     and set up through orangepi-setup.md (your user exists, Wi-Fi is up,
#     SSH works, avahi-daemon is installed).
#   - You have SSH key access and the user has sudo (password or NOPASSWD).
#   - The Pi has internet access (apt + github reachable).
#
# What this script does on the Pi:
#   1. Installs Ambrosia server + client + phoenixd via the upstream install.sh
#   2. Installs Caddy and writes a hostname-aware reverse-proxy Caddyfile
#   3. Installs the Wi-Fi captive-portal service + binary, enables it
#   4. Drops the EFF wordlist at ~/scripts/ so Ambrosia first-boot doesn't
#      need internet
#   5. Writes stub phoenix.conf + ambrosia.conf (auto-liquidity off, http
#      bound to 0.0.0.0)
#   6. Saves the kermés Wi-Fi as a NetworkManager auto-connect profile
#   7. Disables the system dnsmasq (conflicts with the captive portal)
#   8. Adds 127.0.1.1 <hostname>.local to /etc/hosts so local SSR fetches
#      in the Next.js middleware resolve correctly
#   9. (Optional) Applies the reverse-proxy-compat patch to the installed
#      client's proxy.js and rebuilds — required until Ambrosia PR #507
#      merges. Skipped by default to keep the script hermetic.
#
# After this finishes, shut down the Pi, move the SD card to your laptop,
# and run prep-opi-as-golden.sh to wipe per-unit state and re-image as the
# distributable golden.
#
# Usage: ./bootstrap-ambrosia.sh [options]
#   --host <pi-host-or-ip>    SSH target (required)
#   --user <ssh-user>         SSH username (required; also becomes the
#                             Ambrosia user and expected to match the Pi's
#                             hostname, e.g. ambrosia-opi-1)
#   --kermes-ssid <name>      Wi-Fi SSID to pre-save as auto-connect
#   --kermes-password <pw>    WPA password for the above
#   --ambrosia-tag <vX.Y.Z>   Ambrosia release tag (default: v0.6.0-beta)
#   --wordlist <path>         Path to eff_large_wordlist.txt on your laptop
#                             (default: sibling ambrosia checkout at
#                              ~/code/ambrosia/scripts/eff_large_wordlist.txt)
#   --skip-caddy              Don't install/configure Caddy
#   --skip-portal             Don't install the Wi-Fi captive-portal
#   --skip-wifi               Don't save the kermés Wi-Fi profile
#   --no-confirm              Don't pause before making changes
#
# Example:
#   ./bootstrap-ambrosia.sh --host ambrosia-opi-1.local \
#     --user ambrosia-opi-1 \
#     --kermes-ssid "YOUR-VENUE-WIFI" --kermes-password "your-wifi-password"

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

HOST=""
USER_NAME=""
KERMES_SSID=""
KERMES_PW=""
AMBROSIA_TAG="v0.6.0-beta"
WORDLIST="$HOME/code/ambrosia/scripts/eff_large_wordlist.txt"
SKIP_CADDY=0
SKIP_PORTAL=0
SKIP_WIFI=0
NO_CONFIRM=0

usage() { sed -n '2,40p' "$0" | sed 's|^# *||'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --host)             HOST="$2"; shift 2 ;;
        --user)             USER_NAME="$2"; shift 2 ;;
        --kermes-ssid)      KERMES_SSID="$2"; shift 2 ;;
        --kermes-password)  KERMES_PW="$2"; shift 2 ;;
        --ambrosia-tag)     AMBROSIA_TAG="$2"; shift 2 ;;
        --wordlist)         WORDLIST="$2"; shift 2 ;;
        --skip-caddy)       SKIP_CADDY=1; shift ;;
        --skip-portal)      SKIP_PORTAL=1; shift ;;
        --skip-wifi)        SKIP_WIFI=1; shift ;;
        --no-confirm)       NO_CONFIRM=1; shift ;;
        -h|--help)          usage ;;
        *) echo "Unknown option: $1" >&2; usage 1 ;;
    esac
done

[[ -z "$HOST" || -z "$USER_NAME" ]] && { echo "--host and --user are required" >&2; usage 1; }
if [[ $SKIP_WIFI -eq 0 && (-z "$KERMES_SSID" || -z "$KERMES_PW") ]]; then
    echo "--kermes-ssid and --kermes-password are required unless --skip-wifi" >&2
    exit 1
fi

# SSH helper. -S reads the sudo password from stdin; pass via echo for
# commands that need root. `ssh -t` would allocate a tty but breaks piping
# for complex blocks — we use BatchMode and explicit password-piping.
SSH="ssh -o BatchMode=yes ${USER_NAME}@${HOST}"

banner() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

banner "Checking SSH to ${USER_NAME}@${HOST}"
if ! $SSH true 2>/dev/null; then
    echo "SSH key auth to ${USER_NAME}@${HOST} is not set up." >&2
    echo "Run:  ssh-copy-id ${USER_NAME}@${HOST}" >&2
    exit 1
fi

if [[ $NO_CONFIRM -eq 0 ]]; then
    cat <<EOF

About to bootstrap ${HOST} with:
  SSH user:        ${USER_NAME}
  Ambrosia tag:    ${AMBROSIA_TAG}
  Caddy:           $([[ $SKIP_CADDY -eq 0 ]] && echo yes || echo SKIP)
  Wi-Fi portal:    $([[ $SKIP_PORTAL -eq 0 ]] && echo yes || echo SKIP)
  Kermés Wi-Fi:    $([[ $SKIP_WIFI -eq 0 ]] && echo "$KERMES_SSID" || echo SKIP)
  Wordlist:        ${WORDLIST}

This will install packages, enable services, and write config files on the Pi.
Press Enter to continue, Ctrl+C to abort.
EOF
    read -r _
fi

banner "Installing Ambrosia ${AMBROSIA_TAG} (this can take 5-10 min)"
$SSH "curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/${AMBROSIA_TAG}/scripts/install.sh | bash -s -- --yes"

# Stub phoenix.conf / ambrosia.conf always get reset to their minimal form
# by wipe-and-provision.sh, but we put them here too so the first boot
# before golden-prep behaves identically to a cloned unit.
banner "Writing stub configs"
$SSH "mkdir -p ~/.phoenix ~/.Ambrosia-POS && \
     printf 'auto-liquidity=off\nmax-mining-fee=5000\n' > ~/.phoenix/phoenix.conf && \
     printf 'http-bind-ip=0.0.0.0\nhttp-bind-port=9154\n' > ~/.Ambrosia-POS/ambrosia.conf"

banner "Copying EFF wordlist"
if [[ ! -f "$WORDLIST" ]]; then
    echo "Wordlist not found at $WORDLIST" >&2
    echo "Point --wordlist at eff_large_wordlist.txt from the ambrosia repo." >&2
    exit 1
fi
scp -q -o BatchMode=yes "$WORDLIST" "${USER_NAME}@${HOST}:/tmp/eff_large_wordlist.txt"
$SSH "mkdir -p ~/scripts && mv -f /tmp/eff_large_wordlist.txt ~/scripts/"

if [[ $SKIP_CADDY -eq 0 ]]; then
    banner "Installing Caddy + writing Caddyfile"
    $SSH "sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl && \
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && \
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null && \
        sudo apt-get update && sudo apt-get install -y caddy"

    # Use the Pi's hostname for the Caddy site block. wipe-and-provision.sh
    # sed-replaces this later when renaming each clone.
    $SSH "H=\$(hostname); printf '{\n    debug\n    local_certs\n}\n\n%s.local {\n    tls internal\n    reverse_proxy /ws/* localhost:9154\n    reverse_proxy localhost:3000\n}\n' \"\$H\" | sudo tee /etc/caddy/Caddyfile > /dev/null && sudo systemctl restart caddy"
fi

banner "Adding 127.0.1.1 <hostname>.local to /etc/hosts"
# Ambrosia's Next.js middleware does SSR fetches against its own public URL;
# the proxy.js fix in PR #507 makes them hit 127.0.0.1 instead, but even
# without the patch we need <host>.local to resolve on-box for other tools.
$SSH "H=\$(hostname); grep -q \"\$H.local\" /etc/hosts || echo \"127.0.1.1 \$H.local\" | sudo tee -a /etc/hosts > /dev/null"

if [[ $SKIP_PORTAL -eq 0 ]]; then
    banner "Installing Wi-Fi captive-portal service"
    scp -q -o BatchMode=yes "$SCRIPT_DIR/ambrosia-wifi-portal" "${USER_NAME}@${HOST}:/tmp/"
    scp -q -o BatchMode=yes "$SCRIPT_DIR/ambrosia-wifi-portal.service" "${USER_NAME}@${HOST}:/tmp/"
    $SSH "sudo apt-get install -y hostapd python3-flask && \
        sudo install -m 0755 /tmp/ambrosia-wifi-portal /usr/local/bin/ambrosia-wifi-portal && \
        sudo install -m 0644 /tmp/ambrosia-wifi-portal.service /etc/systemd/system/ambrosia-wifi-portal.service && \
        sudo systemctl disable --now dnsmasq hostapd 2>/dev/null || true && \
        sudo systemctl daemon-reload && \
        sudo systemctl enable ambrosia-wifi-portal"
fi

if [[ $SKIP_WIFI -eq 0 ]]; then
    banner "Saving kermés Wi-Fi (${KERMES_SSID}) as auto-connect profile"
    $SSH "sudo nmcli connection delete \"${KERMES_SSID}\" 2>/dev/null || true && \
        sudo nmcli connection add type wifi con-name \"${KERMES_SSID}\" ifname wlan0 \
            ssid \"${KERMES_SSID}\" \
            wifi-sec.key-mgmt wpa-psk wifi-sec.psk \"${KERMES_PW}\" \
            connection.autoconnect yes"
fi

banner "All done."
cat <<EOF

Next steps:
  1. Shut the Pi down cleanly:    ssh ${USER_NAME}@${HOST} 'sudo shutdown -h now'
  2. Pull the microSD card and insert it into your laptop's reader.
  3. Run prep-opi-as-golden.sh to wipe per-unit state, then dd the card to
     a compressed image file. See clone-fleet.md Step 3 for details.

Important caveat (Ambrosia PR #507):
  If you installed Caddy and want the HTTPS + captive-portal flow to work
  with the Ambrosia client, you must also apply the reverse-proxy-compat
  patch to the installed client until Ambrosia upstreams it. See:
      https://github.com/olympus-btc/ambrosia/pull/507
  The installer ships a pre-built Next.js client that doesn't have this
  fix; patching requires rebuilding the client from source. This script
  does NOT do that automatically.
EOF
