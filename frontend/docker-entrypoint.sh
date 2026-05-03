#!/bin/sh
# docker-entrypoint.sh - Nginx smart config selector

PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-tradeflex.in}"
SERVER_NAMES="${SERVER_NAMES:-$PRIMARY_DOMAIN www.$PRIMARY_DOMAIN}"

CERT_PATH="/etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem"
SSL_OPTIONS="/etc/letsencrypt/options-ssl-nginx.conf"
DH_PARAMS="/etc/letsencrypt/ssl-dhparams.pem"

render_template() {
    src="$1"
    dest="$2"
    cp "$src" "$dest"
    sed -i "s/__SERVER_NAMES__/$SERVER_NAMES/g; s/__CERT_DOMAIN__/$PRIMARY_DOMAIN/g" "$dest"
}

if [ -f "$CERT_PATH" ] && [ -f "$SSL_OPTIONS" ] && [ -f "$DH_PARAMS" ]; then
    echo "[nginx-entrypoint] SSL certs found, using HTTPS config"
    render_template /etc/nginx/conf.d/nginx-https.tpl /etc/nginx/conf.d/default.conf
else
    echo "[nginx-entrypoint] No SSL certs yet, using HTTP-only config for ACME challenge"
    render_template /etc/nginx/conf.d/nginx-http.tpl /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
