#!/bin/sh

set -eu

DEFAULT_SERVER_HOST="ratel-be.youdomain.com"
DEFAULT_SERVER_NAME="Nico"
DEFAULT_SERVER_VERSION="v1.3.0"

APP_PORT=${PORT:-8080}
RATEL_SERVER_HOST=${RATEL_SERVER_HOST:-$DEFAULT_SERVER_HOST}
RATEL_SERVER_NAME=${RATEL_SERVER_NAME:-$DEFAULT_SERVER_NAME}
RATEL_SERVER_VERSION=${RATEL_SERVER_VERSION:-$DEFAULT_SERVER_VERSION}
RATEL_IS_DEVELOPMENT=${RATEL_IS_DEVELOPMENT:-false}
BACKEND_USE=${BACKEND_USE:-wss}

case "$APP_PORT" in
    ''|*[!0-9]*)
        echo "PORT must be a number, got: $APP_PORT" >&2
        exit 1
        ;;
esac

if [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
    echo "PORT must be between 1 and 65535, got: $APP_PORT" >&2
    exit 1
fi

case "$BACKEND_USE" in
    ws|wss) ;;
    *)
        echo "BACKEND_USE must be ws or wss, got: $BACKEND_USE" >&2
        exit 1
        ;;
esac

case "$RATEL_IS_DEVELOPMENT" in
    true|false) ;;
    *)
        echo "RATEL_IS_DEVELOPMENT must be true or false, got: $RATEL_IS_DEVELOPMENT" >&2
        exit 1
        ;;
esac

if [ -n "${RATEL_SERVER_PORT:-}" ]; then
    SERVER_PORT=$RATEL_SERVER_PORT
elif [ "$BACKEND_USE" = "wss" ]; then
    SERVER_PORT=443
else
    SERVER_PORT=80
fi

case "$SERVER_PORT" in
    ''|*[!0-9]*)
        echo "RATEL_SERVER_PORT must be a number, got: $SERVER_PORT" >&2
        exit 1
        ;;
esac

if [ "$SERVER_PORT" -lt 1 ] || [ "$SERVER_PORT" -gt 65535 ]; then
    echo "RATEL_SERVER_PORT must be between 1 and 65535, got: $SERVER_PORT" >&2
    exit 1
fi

if [ -n "${RATEL_WS_URL:-}" ]; then
    WS_ADDRESS=$RATEL_WS_URL
    case "$WS_ADDRESS" in
        ws://*|wss://*) ;;
        *)
            echo "RATEL_WS_URL must start with ws:// or wss://" >&2
            exit 1
            ;;
    esac
else

    if { [ "$BACKEND_USE" = "ws" ] && [ "$SERVER_PORT" = "80" ]; } || \
       { [ "$BACKEND_USE" = "wss" ] && [ "$SERVER_PORT" = "443" ]; }; then
        WS_ADDRESS="${BACKEND_USE}://${RATEL_SERVER_HOST}/ws"
    else
        WS_ADDRESS="${BACKEND_USE}://${RATEL_SERVER_HOST}:${SERVER_PORT}/ws"
    fi
fi

SERVER_ADDRESS=${RATEL_SERVER_ADDRESS:-"${RATEL_SERVER_HOST}:${SERVER_PORT}:${RATEL_SERVER_NAME}[${RATEL_SERVER_VERSION}]"}

# Environment variables are controlled by the deployer, but still escape them
# before embedding them in JavaScript strings.
escape_js_string() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

SERVER_ADDRESS_ESCAPED=$(escape_js_string "$SERVER_ADDRESS")
WS_ADDRESS_ESCAPED=$(escape_js_string "$WS_ADDRESS")

sed "s/__PORT__/$APP_PORT/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

cat > /usr/share/nginx/html/js/config.js <<EOF
/** Generated at container startup. Configure this file with environment variables. */
window.RatelConfig = {
    serverAddress: "$SERVER_ADDRESS_ESCAPED",
    wsAddress: "$WS_ADDRESS_ESCAPED",
    isDevelopment: $RATEL_IS_DEVELOPMENT
};
EOF

echo "Ratel client configured"
echo "  listen port: $APP_PORT"
echo "  server: $SERVER_ADDRESS"
echo "  websocket: $WS_ADDRESS"

nginx -t
exec nginx -g "daemon off;"
