#!/bin/sh
set -eu

runtime_config_path="/usr/share/nginx/html/runtime-config.js"

js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_url="$(js_string "${DASHBOARD_API_URL:-/api}")"
api_token="$(js_string "${DASHBOARD_API_TOKEN:-${API_TOKEN:-}}")"
app_version="$(js_string "${DASHBOARD_APP_VERSION:-0.1.0}")"
refresh_interval="${DASHBOARD_REFRESH_INTERVAL:-5}"

case "$refresh_interval" in
  ''|*[!0-9]*)
    refresh_interval="5"
    ;;
esac

cat > "$runtime_config_path" <<EOF
window.__TMRL_RUNTIME_CONFIG__ = {
  apiUrl: "$api_url",
  apiToken: "$api_token",
  refreshInterval: $refresh_interval,
  appVersion: "$app_version"
};
EOF
