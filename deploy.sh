#!/bin/bash
set -e

# Get current nginx config
docker cp swingmaster-frontend:/etc/nginx/conf.d/default.conf /tmp/default.conf
echo "=== Current config ==="
cat /tmp/default.conf

# Remove auth_basic lines from the /api/ location
sed -i '/auth_basic/d' /tmp/default.conf
echo "=== Updated config ==="
cat /tmp/default.conf

# Copy back and reload
docker cp /tmp/default.conf swingmaster-frontend:/etc/nginx/conf.d/default.conf
docker exec swingmaster-frontend nginx -s reload
rm -f /tmp/default.conf /tmp/deploy.sh
echo "=== NGINX AUTH REMOVED ==="
