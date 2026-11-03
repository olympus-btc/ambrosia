#!/bin/bash

PHOENIX_DATADIR="${PHOENIX_DATADIR:-$HOME/.phoenix}"
PID_FILE="$PHOENIX_DATADIR/phoenixd.pid"

mkdir -p "$PHOENIX_DATADIR"

SHOULD_STOP=0
trap 'SHOULD_STOP=1; [ -n "$CHILD_PID" ] && kill -TERM "$CHILD_PID" 2>/dev/null' TERM INT

while true; do
    phoenixd --agree-to-terms-of-service &
    CHILD_PID=$!
    echo "$CHILD_PID" > "$PID_FILE"
    wait "$CHILD_PID"
    rm -f "$PID_FILE"
    [ "$SHOULD_STOP" -eq 1 ] && break
    sleep 1
done
