# nginx reverse proxy

## Development (HTTP only)

Uses `nginx.conf`. nginx listens on port 80 and proxies to `backend:3000`.

```bash
docker compose up
```

## Production (HTTPS)

Uses `nginx.prod.conf`. Requires TLS certificates mounted at `/etc/nginx/certs/`.

### Option A — Let's Encrypt (recommended)

```bash
# Install certbot and generate certificates
certbot certonly --standalone -d your-domain.com

# Certificates will be at:
#   /etc/letsencrypt/live/your-domain.com/fullchain.pem
#   /etc/letsencrypt/live/your-domain.com/privkey.pem
```

Then point the volume in `docker-compose.prod.yml` to `/etc/letsencrypt/live/your-domain.com`.

### Option B — Self-signed (local testing only)

```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

### Deploy with HTTPS

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
