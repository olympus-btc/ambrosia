#!/bin/bash
# Bake phoenixd + Ambrosia stub configs into an existing golden image, so fresh
# clones boot with LAN-reachable HTTP + disabled auto-liquidity out of the box.
#
# Produces a new *-stubbed.img.gz next to the input, leaving the original untouched.
#
# Usage: sudo ./stubify-golden.sh <path-to-golden.img.gz>
# Example: sudo ./stubify-golden.sh ~/ambrosia-golden-20260421.img.gz

set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" ]]; then
    echo "Usage: sudo $0 <path-to-golden.img.gz>" >&2
    exit 1
fi
if [[ $EUID -ne 0 ]]; then
    echo "Must run as root (try: sudo $0 $SRC)" >&2
    exit 1
fi
if [[ ! -f "$SRC" ]]; then
    echo "Not a file: $SRC" >&2
    exit 1
fi

# Derive output path: foo.img.gz -> foo-stubbed.img.gz
DIR=$(dirname "$SRC")
BASE=$(basename "$SRC" .img.gz)
WORK_IMG="$DIR/${BASE}-stubbed.img"
OUT_GZ="$DIR/${BASE}-stubbed.img.gz"

if [[ -e "$WORK_IMG" || -e "$OUT_GZ" ]]; then
    echo "Output file already exists: $WORK_IMG or $OUT_GZ" >&2
    echo "Remove it first if you want to regenerate." >&2
    exit 1
fi

MNT=/mnt/golden-stubify
LOOPDEV=""

cleanup() {
    set +e
    if mountpoint -q "$MNT"; then umount "$MNT"; fi
    if [[ -n "$LOOPDEV" ]] && losetup "$LOOPDEV" >/dev/null 2>&1; then
        losetup -d "$LOOPDEV"
    fi
}
trap cleanup EXIT

echo "==> Decompressing $SRC -> $WORK_IMG"
gunzip -c "$SRC" > "$WORK_IMG"

echo "==> Attaching loop device"
LOOPDEV=$(losetup -f -P --show "$WORK_IMG")
echo "    $LOOPDEV (partition: ${LOOPDEV}p1)"

echo "==> Mounting ${LOOPDEV}p1 at $MNT"
mkdir -p "$MNT"
mount "${LOOPDEV}p1" "$MNT"

USERHOME="$MNT/home/ambrosia-opi-1"
if [[ ! -d "$USERHOME" ]]; then
    echo "ERROR: expected $USERHOME in the image. Is this a fresh OrangePi golden?" >&2
    exit 1
fi

echo "==> Writing stub configs"
rm -rf "$USERHOME/.phoenix" "$USERHOME/.Ambrosia-POS"
mkdir -p "$USERHOME/.phoenix" "$USERHOME/.Ambrosia-POS"

cat > "$USERHOME/.phoenix/phoenix.conf" <<'PHX_EOF'
auto-liquidity=off
max-mining-fee=5000
PHX_EOF

cat > "$USERHOME/.Ambrosia-POS/ambrosia.conf" <<'AMB_EOF'
http-bind-ip=0.0.0.0
http-bind-port=9154
AMB_EOF

chown -R 1001:1001 "$USERHOME/.phoenix" "$USERHOME/.Ambrosia-POS"

echo "==> Verifying"
ls -la "$USERHOME/.phoenix" "$USERHOME/.Ambrosia-POS" | sed 's/^/    /'
echo "    --- phoenix.conf ---"
cat "$USERHOME/.phoenix/phoenix.conf" | sed 's/^/    /'
echo "    --- ambrosia.conf ---"
cat "$USERHOME/.Ambrosia-POS/ambrosia.conf" | sed 's/^/    /'

echo "==> Unmounting and detaching"
umount "$MNT"
losetup -d "$LOOPDEV"
LOOPDEV=""

echo "==> Recompressing -> $OUT_GZ"
gzip "$WORK_IMG"
# gzip replaces $WORK_IMG with $WORK_IMG.gz, which matches $OUT_GZ

ls -lh "$SRC" "$OUT_GZ" | sed 's/^/    /'

echo
echo "==> Done."
echo "    Original (untouched): $SRC"
echo "    Stubbed golden:       $OUT_GZ"
echo "    Flash future clones from the stubbed image."
