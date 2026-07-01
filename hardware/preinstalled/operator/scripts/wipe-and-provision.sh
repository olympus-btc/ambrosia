#!/bin/bash
# Wipe all per-unit state on an Ambrosia OrangePi clone and provision it
# with a new identity. Destructive — erases .phoenix (wallet seed, channel
# DB), .Ambrosia-POS (admin DB, keystore, uploads), Caddy PKI, SSH host
# keys, machine-id, and bash history; then renames user/hostname/service
# files/Caddyfile to the new name, regenerates SSH host keys, writes stub
# configs, and resets the password to the new name.
#
# Safe to run on a freshly-flashed golden card (first assignment) and also
# on a card that was booted once for verification (re-assignment). If
# <new-name> equals the current name, acts as a reset-in-place.
#
# Run on your laptop against the mounted SD card, NOT on the OrangePi.
#
# Usage: sudo ./wipe-and-provision.sh <new-name> [device] [old-name]
#   <new-name>  e.g. ambrosia-opi-2
#   [device]    block device holding the clone (default: /dev/sda)
#   [old-name]  current user/hostname on the card. Default: auto-detect from
#               UID 1001 in the mounted /etc/passwd. Pass this explicitly
#               only if the card has multiple non-system users.
#
# Env vars:
#   NEW_PASSWORD  If set, used as the unit password instead of generating a
#                 random one. Useful for re-provisioning a card with its
#                 previous password. sudo strips env by default — pass it
#                 with `sudo -E` or inline: `sudo NEW_PASSWORD=... ./...`

set -euo pipefail

NEW="${1:-}"
DEV="${2:-/dev/sda}"
OLD_OVERRIDE="${3:-}"
PART="${DEV}1"
MNT=/mnt/opi-wipe-and-provision

if [[ -z "$NEW" ]]; then
    echo "Usage: sudo $0 <new-name> [device] [old-name]" >&2
    echo "Example: sudo $0 ambrosia-opi-2 /dev/sda" >&2
    exit 1
fi

if [[ $EUID -ne 0 ]]; then
    echo "Must run as root (try: sudo $0 $NEW $DEV)" >&2
    exit 1
fi

if [[ ! -b "$PART" ]]; then
    echo "Partition $PART not found. Is the card inserted and is $DEV correct?" >&2
    exit 1
fi

echo "==> Unmounting any auto-mounted partitions on $DEV"
umount "${DEV}"* 2>/dev/null || true

echo "==> Mounting $PART at $MNT"
mkdir -p "$MNT"
mount "$PART" "$MNT"

# Auto-detect the current non-system user (UID 1001) unless overridden
if [[ -n "$OLD_OVERRIDE" ]]; then
    OLD="$OLD_OVERRIDE"
else
    OLD=$(awk -F: '$3 == 1001 {print $1; exit}' "$MNT/etc/passwd" || true)
fi

if [[ -z "$OLD" ]]; then
    echo "ERROR: could not find a UID-1001 user on $PART to rename." >&2
    umount "$MNT" || true
    exit 1
fi
echo "==> Detected current user: $OLD"

if [[ "$NEW" == "$OLD" ]]; then
    echo "==> Same name — running as reset-in-place (steps 1-4 are no-ops; steps 5-7 will wipe boot state)"
fi

cleanup() {
    echo "==> Unmounting $MNT"
    umount "$MNT" || true
}
trap cleanup EXIT

# Sanity check: the old user must actually be on this card
if ! grep -q "^${OLD}:" "$MNT/etc/passwd"; then
    echo "ERROR: user '${OLD}' not found in $MNT/etc/passwd" >&2
    echo "This card doesn't look like a fresh Ambrosia clone. Aborting." >&2
    exit 1
fi

if [[ "$NEW" != "$OLD" ]] && grep -q "^${NEW}:" "$MNT/etc/passwd"; then
    echo "ERROR: user '${NEW}' already exists in $MNT/etc/passwd" >&2
    echo "Was this clone already renamed? Aborting." >&2
    exit 1
fi

echo "==> Renaming: $OLD -> $NEW"

echo "    [1/7] Hostname and /etc/hosts"
echo "$NEW" > "$MNT/etc/hostname"
sed -i "s/\b${OLD}\b/${NEW}/g" "$MNT/etc/hosts"

echo "    [2/7] User identity (passwd, shadow, group, gshadow)"
sed -i "s/\b${OLD}\b/${NEW}/g" \
    "$MNT/etc/passwd" \
    "$MNT/etc/shadow" \
    "$MNT/etc/group" \
    "$MNT/etc/gshadow"

echo "    [3/7] Home directory"
if [[ "$OLD" != "$NEW" ]]; then
    mv "$MNT/home/${OLD}" "$MNT/home/${NEW}"
fi
# Wipe per-user SSH state — authorized_keys carried over from the golden
# would let whoever set up the golden SSH into every vendor's unit. Same
# for known_hosts.
rm -rf "$MNT/home/${NEW}/.ssh"
# Defensive: prune any orphan /home/ambrosia-opi-* dirs left from a sloppy
# golden bake (e.g. SSH key still in some old user's home from before the
# golden was prepped). Should be a no-op on a properly-prepped golden.
for d in "$MNT"/home/ambrosia-opi-*; do
    [[ -d "$d" ]] || continue
    base=$(basename "$d")
    if [[ "$base" != "$NEW" ]]; then
        echo "        pruning orphan home: $base"
        rm -rf "$d"
    fi
done

echo "    [4/7] Systemd service files + Caddyfile"
for svc in phoenixd ambrosia ambrosia-client; do
    f="$MNT/etc/systemd/system/${svc}.service"
    if [[ -f "$f" ]]; then
        sed -i "s/\b${OLD}\b/${NEW}/g" "$f"
    fi
done
if [[ -f "$MNT/etc/caddy/Caddyfile" ]]; then
    sed -i "s/\b${OLD}\b/${NEW}/g" "$MNT/etc/caddy/Caddyfile"
fi

echo "    [5/7] Fresh SSH host keys (unique per clone)"
rm -f "$MNT/etc/ssh/ssh_host_"*
ssh-keygen -q -t rsa     -b 4096 -N '' -f "$MNT/etc/ssh/ssh_host_rsa_key"
ssh-keygen -q -t ecdsa           -N '' -f "$MNT/etc/ssh/ssh_host_ecdsa_key"
ssh-keygen -q -t ed25519         -N '' -f "$MNT/etc/ssh/ssh_host_ed25519_key"

if [[ -n "${NEW_PASSWORD:-}" ]]; then
    echo "    [6/7] Password (from \$NEW_PASSWORD env var)"
else
    echo "    [6/7] Password (random, 12 chars, no confusable glyphs)"
    # Avoid visually-confusable characters: 0/O, 1/l/I, no mixed case to
    # ease transcription to a paper card for the vendor.
    # Read a finite chunk of urandom (~256 bytes >> 12 chars after filtering)
    # so the pipeline doesn't SIGPIPE under set -o pipefail.
    NEW_PASSWORD=$(head -c 256 /dev/urandom | LC_ALL=C tr -dc 'abcdefghjkmnpqrstuvwxyz23456789' | head -c 12)
fi
NEW_HASH=$(openssl passwd -6 "$NEW_PASSWORD")
sed -i "s|^${NEW}:[^:]*:|${NEW}:${NEW_HASH}:|" "$MNT/etc/shadow"

# Append to a per-laptop log so you keep a record across runs. When run via
# sudo, write to the invoking user's home, not /root.
if [[ -n "${SUDO_USER:-}" ]]; then
    LOG_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    LOG_HOME="$HOME"
fi
PASSWORD_LOG="${LOG_HOME}/ambrosia-fleet-passwords.txt"
# Replace any existing entry for this unit so re-provisioning overwrites
# rather than accumulates duplicates.
if [[ -f "$PASSWORD_LOG" ]]; then
    sed -i "/^${NEW}[[:space:]]/d" "$PASSWORD_LOG"
fi
printf '%-24s  %s\n' "$NEW" "$NEW_PASSWORD" >> "$PASSWORD_LOG"
if [[ -n "${SUDO_USER:-}" ]]; then
    chown "$SUDO_USER:$SUDO_USER" "$PASSWORD_LOG" 2>/dev/null || true
fi
chmod 600 "$PASSWORD_LOG" 2>/dev/null || true

echo "    [7/7] Stub configs + Caddy state reset"
# Clear any residue (e.g. from an aborted first boot that started services)
# and write the minimal configs the services need on first startup.
rm -rf "$MNT/home/${NEW}/.phoenix" "$MNT/home/${NEW}/.Ambrosia-POS"
mkdir -p "$MNT/home/${NEW}/.phoenix" "$MNT/home/${NEW}/.Ambrosia-POS"
cat > "$MNT/home/${NEW}/.phoenix/phoenix.conf" <<'PHX_EOF'
auto-liquidity=off
max-mining-fee=5000
PHX_EOF
cat > "$MNT/home/${NEW}/.Ambrosia-POS/ambrosia.conf" <<'AMB_EOF'
http-bind-ip=0.0.0.0
http-bind-port=9154
AMB_EOF
chown -R 1001:1001 "$MNT/home/${NEW}/.phoenix" "$MNT/home/${NEW}/.Ambrosia-POS"
# Wipe any Caddy CA + cert storage carried over from the golden so this clone
# generates its own on first boot (independent per-unit PKI).
rm -rf "$MNT"/var/lib/caddy/.local/share/caddy/* 2>/dev/null || true
rm -f "$MNT"/var/lib/caddy/.config/caddy/autosave.json 2>/dev/null || true

echo "==> Verifying"
grep "^${NEW}:" "$MNT/etc/passwd" | sed 's/:[^:]*:/:x:/'
ls "$MNT/etc/ssh/" | grep ssh_host_ | sed 's/^/    /'
ls -d "$MNT/home/${NEW}" | sed 's/^/    /'
ls "$MNT/home/${NEW}/.phoenix/" "$MNT/home/${NEW}/.Ambrosia-POS/" | sed 's/^/    /'
if [[ -f "$MNT/etc/caddy/Caddyfile" ]]; then
    echo "    Caddyfile host line: $(grep -E "^${NEW}\.local" "$MNT/etc/caddy/Caddyfile" || echo 'MISSING!')"
fi

echo
echo "==> Done. Clone provisioned as: $NEW"
echo
echo "    ┌────────────────────────────────────────────────────────┐"
printf  "    │  Login:     ssh %-37s  │\n" "${NEW}@${NEW}.local"
printf  "    │  Password:  %-41s  │\n" "$NEW_PASSWORD"
echo    "    └────────────────────────────────────────────────────────┘"
echo
echo "    Password also logged to: $PASSWORD_LOG"
echo "    ** Tell the vendor to run 'passwd' on first login to change it. **"
echo "    Safe to eject $DEV and boot the OrangePi."
