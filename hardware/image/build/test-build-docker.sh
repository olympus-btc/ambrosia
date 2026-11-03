#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

# Capture the container invocation without requiring Docker or root access.
cat > "$TEST_DIR/container-engine" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$CAPTURE_FILE"
EOF
chmod +x "$TEST_DIR/container-engine"
touch "$TEST_DIR/base image.img"

CAPTURE_FILE="$TEST_DIR/args" CONTAINER_ENGINE="$TEST_DIR/container-engine" \
  bash "$SCRIPT_DIR/build-docker.sh" \
  --board opi-zero-2w --base-image "$TEST_DIR/base image.img" \
  --skip-artifacts-build >/dev/null

for expected in \
  '--privileged' \
  '--mount' \
  'type=bind,source=/dev,target=/dev' \
  "$TEST_DIR:/image-input:ro" \
  '/image-input/base image.img' \
  '--skip-artifacts-build' \
  'opi-zero-2w' \
  'git config --global --add safe.directory /repo' \
  'if ! losetup --find >/dev/null; then'; do
  grep -Fxq -- "$expected" "$TEST_DIR/args" || {
    printf 'Missing container argument or bootstrap command: %s\n' "$expected" >&2
    exit 1
  }
done

printf 'Docker wrapper regression checks passed.\n'
