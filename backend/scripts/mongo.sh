#!/usr/bin/env bash
# Local MongoDB control (no Homebrew/root needed) — uses the mongod binary
# bundled in .mongo/bin and stores data in .mongo/data.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$DIR/.mongo/bin/mongod"
DATA="$DIR/.mongo/data"
LOG="$DIR/.mongo/mongod.log"
PIDFILE="$DIR/.mongo/mongod.pid"
PORT="${MONGO_PORT:-27017}"

start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "MongoDB ya está corriendo (PID $(cat "$PIDFILE"))"
    exit 0
  fi
  mkdir -p "$DATA"
  nohup "$BIN" --dbpath "$DATA" --port "$PORT" --bind_ip 127.0.0.1 --logpath "$LOG" \
    > /dev/null 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
  echo "MongoDB iniciado en localhost:$PORT (PID $(cat "$PIDFILE"))"
}

stop() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    kill "$(cat "$PIDFILE")"
    rm -f "$PIDFILE"
    echo "MongoDB detenido."
  else
    echo "MongoDB no está corriendo."
  fi
}

status() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "MongoDB corriendo (PID $(cat "$PIDFILE")) en localhost:$PORT"
  else
    echo "MongoDB no está corriendo."
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "Uso: $0 {start|stop|status}"; exit 1 ;;
esac
