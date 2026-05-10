#!/bin/sh
cp /etc/nginx/conf.d/nginx-https.tpl /etc/nginx/conf.d/default.conf
sed -i 's/__SERVER_NAMES__/tradeflex.in www.tradeflex.in/g' /etc/nginx/conf.d/default.conf
sed -i 's/__CERT_DOMAIN__/tradeflex.in/g' /etc/nginx/conf.d/default.conf
echo "--- Generated default.conf ---"
cat /etc/nginx/conf.d/default.conf | grep -A5 'location /api'
nginx -s reload
echo "NGINX RELOADED"
