#!/bin/sh
# docker-entrypoint.sh - Nginx smart config selector

CERT_PATH="/etc/letsencrypt/live/omniquant.duckdns.org/fullchain.pem"
SSL_OPTIONS="/etc/letsencrypt/options-ssl-nginx.conf"
DH_PARAMS="/etc/letsencrypt/ssl-dhparams.pem"

if [ -f "$CERT_PATH" ] && [ -f "$SSL_OPTIONS" ] && [ -f "$DH_PARAMS" ]; then
    echo "[nginx-entrypoint] SSL certs found, using HTTPS config"
    cp /etc/nginx/conf.d/nginx-https.tpl /etc/nginx/conf.d/default.conf
else
    echo "[nginx-entrypoint] No SSL certs yet, using HTTP-only config for ACME challenge"
    cp /etc/nginx/conf.d/nginx-http.tpl /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"

