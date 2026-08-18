#!/usr/bin/env bash
# Forwards Stripe webhook events to the local backend during development.
# Uses the Stripe CLI binary bundled in .stripe-cli (no Homebrew needed).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$DIR/.stripe-cli/stripe"
ENV_FILE="$DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "No se encontró backend/.env. Copia .env.example primero." >&2
  exit 1
fi

STRIPE_KEY="$(grep '^STRIPE_SECRET_KEY=' "$ENV_FILE" | cut -d= -f2-)"
PORT="$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2- || echo 5050)"

if [ -z "$STRIPE_KEY" ] || [[ "$STRIPE_KEY" == *xxxx* ]]; then
  echo "STRIPE_SECRET_KEY no está configurada en backend/.env." >&2
  exit 1
fi

echo "Reenviando webhooks de Stripe a localhost:${PORT}/api/webhooks/stripe ..."
echo "(el primer arranque puede tardar unos segundos; el whsec_... que imprime"
echo " debe coincidir con STRIPE_WEBHOOK_SECRET en backend/.env)"
exec "$BIN" listen --api-key "$STRIPE_KEY" --forward-to "localhost:${PORT}/api/webhooks/stripe"
