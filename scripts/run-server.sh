#!/bin/bash

# Script to run Ambrosia POS Server with logging enabled
# Usage: ./run-server.sh [application options]

# Initialize SDKMAN! if installed
if [ -f "$HOME/.sdkman/bin/sdkman-init.sh" ]; then
    source "$HOME/.sdkman/bin/sdkman-init.sh"
fi

# Determine the script's real directory (resolving symlinks)
SCRIPT_PATH="${BASH_SOURCE[0]}"
# Resolve symlinks to get the actual script location
while [ -L "$SCRIPT_PATH" ]; do
    SCRIPT_DIR=$(cd -- "$(dirname -- "$SCRIPT_PATH")" &> /dev/null && pwd)
    SCRIPT_PATH=$(readlink "$SCRIPT_PATH")
    # Handle relative symlinks
    [[ $SCRIPT_PATH != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
SCRIPT_DIR=$(cd -- "$(dirname -- "$SCRIPT_PATH")" &> /dev/null && pwd)

# Route to the JAR file, assuming it's in the same directory as the script
JAR_PATH="$SCRIPT_DIR/ambrosia.jar"

# Verify that the JAR exists
if [ ! -f "$JAR_PATH" ]; then
    echo "Error: $JAR_PATH not found"
    echo "Please ensure Ambrosia POS is installed correctly in $SCRIPT_DIR"
    exit 1
fi

SHOULD_STOP=0
trap 'SHOULD_STOP=1; [ -n "$CHILD_PID" ] && kill -TERM "$CHILD_PID" 2>/dev/null' TERM INT

while true; do
    java -jar "$JAR_PATH" "$@" &
    CHILD_PID=$!
    wait "$CHILD_PID"
    [ "$SHOULD_STOP" -eq 1 ] && break
    sleep 1
done
