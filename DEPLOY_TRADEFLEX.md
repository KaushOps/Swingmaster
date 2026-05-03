# Deploying TradeFlex to tradeflex.in

This repo is now rebranded to **TradeFlex** and configured to serve `tradeflex.in` and `www.tradeflex.in` via the Docker nginx frontend container.

---

## STEP 1 — Point GoDaddy DNS to your server

In GoDaddy → **My Products → DNS → tradeflex.in**, add or update these records:

```
Type   Name   Value                 TTL
A      @      <your server IPv4>    600s (or default)
A      www    <your server IPv4>    600s (or default)
```

> **Delete any conflicting records** — remove any existing `A`, `AAAA`, `CNAME`, forwarding, or parking records for `@` or `www`. Keep unrelated records (MX/email).

### Get your server's public IP
SSH into your Oracle VM and run:
```bash
curl -4 ifconfig.me
```

### Check DNS propagation (wait 5–30 min)
```bash
nslookup tradeflex.in 8.8.8.8
# Should return your server IP
```

---

## STEP 2 — Pull the rebranded code on the server

```bash
cd ~/swingmaster        # or wherever the repo lives
git pull origin main
```

---

## STEP 3 — Set the production `.env` on the server

Edit (or create) `.env` with the domain values below. Keep your existing API keys and secrets:

```bash
PRIMARY_DOMAIN=tradeflex.in
SERVER_NAMES=tradeflex.in www.tradeflex.in
APP_PUBLIC_URL=https://tradeflex.in
VITE_API_URL=
ALLOWED_ORIGINS=https://tradeflex.in,https://www.tradeflex.in,http://tradeflex.in,http://www.tradeflex.in
```

> `VITE_API_URL` is **intentionally empty** in production — nginx proxies `/api/` internally.

---

## STEP 4 — Start containers in HTTP mode (for SSL challenge)

```bash
docker compose up -d --build frontend backend
```

Verify DNS has propagated and nginx is reachable:
```bash
curl -I http://tradeflex.in/.well-known/acme-challenge/ping
# A 404 from nginx is fine. Timeout = DNS not ready yet.
```

---

## STEP 5 — Issue the Let's Encrypt SSL certificate (first time only)

```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d tradeflex.in -d www.tradeflex.in \
  --email your-email@example.com \
  --agree-tos --no-eff-email
```

Then restart nginx so it switches to HTTPS mode:
```bash
docker compose up -d --build frontend backend
docker compose restart frontend
```

The included `certbot` service auto-renews the certificate every 12 hours.

---

## STEP 6 — Verify everything

```bash
curl -I https://tradeflex.in
curl -I https://www.tradeflex.in
curl https://tradeflex.in/api/scan?market=IN
```

All three should return `200 OK`.

---

## What was rebranded in the codebase

| File | Change |
|------|--------|
| `frontend/index.html` | Title → `TradeFlex — AI Swing Trading Scanner` + meta description |
| `frontend/src/components/TopNavigation.jsx` | Navbar logo text → `TradeFlex` |
| `frontend/nginx-https.tpl` | Auth realm → `TradeFlex Secured Access` |
| `frontend/src/App.css` | Comment header updated |
| `backend/llm_analyst.py` | `X-Title` header → `TradeFlex` |
| `.env` | Comment header updated |
| `docker-compose.yml` | Already configured for `tradeflex.in` domain |
