#!/bin/bash
# Prep an already-configured OrangePi clone (e.g. opi-2 with Caddy installed)
# as a new golden image source. Run on your laptop against the mounted SD card.
# After this finishes, `dd` the card to a new .img.gz.
#
# What it does:
#   - Renames user/home/hostname/service files/Caddyfile from OLD -> NEW
#   - Wipes runtime state (seed.dat, DBs, keystore, uploads, Caddy CA+certs)
#   - Leaves stub configs (phoenix.conf, ambrosia.conf) in place
#   - Wipes SSH host keys, machine-id, bash history, journal
#   - Resets password to match NEW name
#
# Usage: sudo ./prep-opi-as-golden.sh [old-name] [new-name] [device]
# Defaults: old=ambrosia-opi-2, new=ambrosia-opi-1, device=/dev/sda

set -euo pipefail

OLD="${1:-ambrosia-opi-2}"
NEW="${2:-ambrosia-opi-1}"
DEV="${3:-/dev/sda}"
PART="${DEV}1"
MNT=/mnt/opi-golden-prep

if [[ $EUID -ne 0 ]]; then
    echo "Must run as root (try: sudo $0 $OLD $NEW $DEV)" >&2
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

cleanup() {
    echo "==> Unmounting $MNT"
    umount "$MNT" || true
}
trap cleanup EXIT

if ! grep -q "^${OLD}:" "$MNT/etc/passwd"; then
    echo "ERROR: user '${OLD}' not found in $MNT/etc/passwd" >&2
    echo "Check that you passed the right OLD name. Found these users:" >&2
    awk -F: '$3 >= 1000 {print "  " $1}' "$MNT/etc/passwd" >&2
    exit 1
fi

if grep -q "^${NEW}:" "$MNT/etc/passwd"; then
    echo "ERROR: user '${NEW}' already exists. Was this already un-renamed?" >&2
    exit 1
fi

HOME_OLD="$MNT/home/${OLD}"
HOME_NEW="$MNT/home/${NEW}"

echo "==> Renaming $OLD -> $NEW"

echo "    [1/9] Hostname and /etc/hosts"
echo "$NEW" > "$MNT/etc/hostname"
sed -i "s/\b${OLD}\b/${NEW}/g" "$MNT/etc/hosts"

echo "    [2/9] User identity (passwd, shadow, group, gshadow)"
sed -i "s/\b${OLD}\b/${NEW}/g" \
    "$MNT/etc/passwd" \
    "$MNT/etc/shadow" \
    "$MNT/etc/group" \
    "$MNT/etc/gshadow"

echo "    [3/9] Home directory"
mv "$HOME_OLD" "$HOME_NEW"
# Wipe per-user SSH state so the golden doesn't ship authorized_keys to every
# clone (would let the golden's setter SSH into every vendor's unit).
rm -rf "$HOME_NEW/.ssh"
# Defensive: prune any orphan /home/ambrosia-opi-* dirs left from earlier
# rename rounds. Should be a no-op on a clean source.
for d in "$MNT"/home/ambrosia-opi-*; do
    [[ -d "$d" ]] || continue
    base=$(basename "$d")
    if [[ "$base" != "$NEW" ]]; then
        echo "        pruning orphan home: $base"
        rm -rf "$d"
    fi
done

echo "    [4/9] Systemd service files"
for svc in phoenixd ambrosia ambrosia-client; do
    f="$MNT/etc/systemd/system/${svc}.service"
    if [[ -f "$f" ]]; then
        sed -i "s/\b${OLD}\b/${NEW}/g" "$f"
    fi
done

echo "    [5/9] Caddyfile"
if [[ -f "$MNT/etc/caddy/Caddyfile" ]]; then
    sed -i "s/\b${OLD}\b/${NEW}/g" "$MNT/etc/caddy/Caddyfile"
else
    echo "    WARNING: no /etc/caddy/Caddyfile found — is Caddy installed on this card?"
fi

echo "    [6/9] Wipe datadirs and reset stub configs"
# Full wipe of phoenixd + Ambrosia dirs. This also clears any per-unit secrets
# that the services appended to the conf files during first boot
# (e.g. http-password, webhook-secret, Ambrosia 'secret' seed phrase).
rm -rf "$HOME_NEW/.phoenix" "$HOME_NEW/.Ambrosia-POS"
mkdir -p "$HOME_NEW/.phoenix" "$HOME_NEW/.Ambrosia-POS"
cat > "$HOME_NEW/.phoenix/phoenix.conf" <<'PHX_EOF'
auto-liquidity=off
max-mining-fee=5000
PHX_EOF
cat > "$HOME_NEW/.Ambrosia-POS/ambrosia.conf" <<'AMB_EOF'
http-bind-ip=0.0.0.0
http-bind-port=9154
AMB_EOF
chown -R 1001:1001 "$HOME_NEW/.phoenix" "$HOME_NEW/.Ambrosia-POS"
# Caddy state (CA + certs — each clone will regen its own)
rm -rf "$MNT"/var/lib/caddy/.local/share/caddy/* 2>/dev/null || true
rm -f "$MNT"/var/lib/caddy/.config/caddy/autosave.json 2>/dev/null || true

echo "    [7/9] SSH host keys, machine-id"
rm -f "$MNT"/etc/ssh/ssh_host_*
: > "$MNT/etc/machine-id"
rm -f "$MNT/var/lib/dbus/machine-id"
ln -s /etc/machine-id "$MNT/var/lib/dbus/machine-id"

echo "    [8/9] Bash history and journal"
rm -f "$HOME_NEW/.bash_history"
rm -rf "$MNT/var/log/journal"/* 2>/dev/null || true

echo "    [9/9] Password (set to username: ${NEW})"
NEW_HASH=$(openssl passwd -6 "$NEW")
sed -i "s|^${NEW}:[^:]*:|${NEW}:${NEW_HASH}:|" "$MNT/etc/shadow"

echo "==> Verifying"
grep "^${NEW}:" "$MNT/etc/passwd" | sed 's/:[^:]*:/:x:/' | sed 's/^/    /'
echo "    --- stub configs preserved? ---"
[[ -f "$HOME_NEW/.phoenix/phoenix.conf" ]] && echo "    .phoenix/phoenix.conf:" && sed 's/^/      /' "$HOME_NEW/.phoenix/phoenix.conf"
[[ -f "$HOME_NEW/.Ambrosia-POS/ambrosia.conf" ]] && echo "    .Ambrosia-POS/ambrosia.conf:" && sed 's/^/      /' "$HOME_NEW/.Ambrosia-POS/ambrosia.conf"
echo "    --- Caddyfile ---"
[[ -f "$MNT/etc/caddy/Caddyfile" ]] && sed 's/^/      /' "$MNT/etc/caddy/Caddyfile"
echo "    --- runtime files that should be GONE ---"
for p in "$HOME_NEW/.phoenix/seed.dat" "$HOME_NEW/.Ambrosia-POS/ambrosia.db" "$HOME_NEW/.Ambrosia-POS/keystore.jks"; do
    [[ -e "$p" ]] && echo "      STILL THERE: $p" || echo "      gone: $p"
done
echo "    --- Caddy state (should be empty) ---"
ls -A "$MNT/var/lib/caddy/.local/share/caddy/" 2>/dev/null | sed 's/^/      /' || echo "      (empty)"

echo
echo "==> Done. Card is ready to be imaged as the new golden."
echo "    Next: sudo dd if=$DEV bs=4M status=progress | gzip -c > ~/ambrosia-golden-vN-\$(date +%Y%m%d).img.gz"
echo "          (bump vN each time you re-bake; see clone-fleet.md)"
