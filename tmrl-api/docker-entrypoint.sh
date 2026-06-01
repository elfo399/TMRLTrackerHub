#!/bin/sh
set -eu

: "${TMRL_CHOWN_DATA:=true}"

mkdir -p /data/checkpoints /data/memory /data/logs /data/metrics

if [ "$(id -u)" = "0" ]; then
  if [ "$TMRL_CHOWN_DATA" = "true" ] || [ "$TMRL_CHOWN_DATA" = "1" ]; then
    chown -R tmrl:tmrl /data
  fi

  chown -R tmrl:tmrl /app
  exec gosu tmrl "$@"
fi

exec "$@"
