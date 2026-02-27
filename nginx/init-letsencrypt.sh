#!/bin/bash
# Script para obtener el primer certificado Let's Encrypt
# Ejecutar UNA SOLA VEZ antes de levantar el stack completo
#
# Uso: bash nginx/init-letsencrypt.sh

set -e

# Cargar variables de entorno
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DOMAIN" ]; then
  echo "ERROR: Define DOMAIN en tu archivo .env (ej: DOMAIN=api.mievento.com)"
  exit 1
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "ERROR: Define CERTBOT_EMAIL en tu archivo .env (ej: CERTBOT_EMAIL=admin@mievento.com)"
  exit 1
fi

echo "==> Dominio: $DOMAIN"
echo "==> Email:   $CERTBOT_EMAIL"

# Crear directorios necesarios
mkdir -p nginx/certbot/conf nginx/certbot/www

# Paso 1: Levantar nginx en modo HTTP-only (sin SSL) para el desafío ACME
echo ""
echo "==> Iniciando nginx temporal para desafío ACME..."
docker compose up -d nginx

# Esperar que nginx esté listo
sleep 3

# Paso 2: Pedir el certificado
echo ""
echo "==> Solicitando certificado a Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Paso 3: Recargar nginx con SSL activado
echo ""
echo "==> Recargando nginx con SSL..."
docker compose exec nginx nginx -s reload

echo ""
echo "✓ Certificado obtenido correctamente."
echo "  Ahora podés levantar el stack completo con: docker compose up -d"
