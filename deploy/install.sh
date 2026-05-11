#!/bin/bash
# TradeFlex AI Trading Signals Platform - AWS VM Installation Script
# Version: 6.1.0 (Per-Symbol R:R Scaling Release)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== TradeFlex Platform Installer ===${NC}"
echo -e "${GREEN}Version: 6.1.0 - Per-Symbol R:R Scaling${NC}"
echo ""

# Configuration
INSTALL_DIR="/opt/tradeflex"
SERVICE_NAME="tradeflex"
BACKEND_PORT=8000

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    nginx \
    curl \
    git \
    supervisor \
    nodejs \
    npm \
    certbot \
    python3-certbot-nginx

# Create installation directory
echo -e "${YELLOW}Creating installation directory...${NC}"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone repository (or copy if local)
if [ -d ".git" ]; then
    echo -e "${YELLOW}Updating repository...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}Please ensure code is copied to $INSTALL_DIR${NC}"
    exit 1
fi

# Setup Python virtual environment
echo -e "${YELLOW}Setting up Python environment...${NC}"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Create data directories
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p backend/data/ledger_snapshots
mkdir -p backend/logs

# Setup permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R www-data:www-data $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

# Install systemd service
echo -e "${YELLOW}Installing systemd service...${NC}"
cp deploy/tradeflex.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable tradeflex.service

# Setup Nginx
echo -e "${YELLOW}Configuring Nginx...${NC}"
cp deploy/nginx.conf /etc/nginx/sites-available/tradeflex
ln -sf /etc/nginx/sites-available/tradeflex /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

# Setup frontend serving
mkdir -p /var/www/tradeflex
cp -r frontend/dist/* /var/www/tradeflex/
chown -R www-data:www-data /var/www/tradeflex

# Start services
echo -e "${YELLOW}Starting services...${NC}"
systemctl start tradeflex.service
systemctl restart nginx

# Setup SSL (if domain is configured)
if [ -n "$DOMAIN" ]; then
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

# Check service status
echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo -e "Backend API: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "Frontend: ${GREEN}http://localhost${NC}"
echo ""
echo -e "Service Status:"
systemctl status tradeflex.service --no-pager

# Health check
echo ""
echo -e "${YELLOW}Running health check...${NC}"
sleep 5
if curl -f http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "Check logs: journalctl -u tradeflex.service -f"
fi

echo ""
echo -e "${GREEN}TradeFlex Platform is ready!${NC}"
echo -e "Edit configuration: nano $INSTALL_DIR/backend/.env"
echo -e "View logs: journalctl -u tradeflex.service -f"
echo -e "Restart: systemctl restart tradeflex.service"
