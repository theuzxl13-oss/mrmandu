#!/usr/bin/env bash
# Preparação automática do Codespace (roda uma vez, ao criar o ambiente).
set -euo pipefail

if [ ! -f .env ]; then
  cat > .env <<ENV
DATABASE_URL="postgresql://postgres:postgres@db:5432/mrmandu?schema=public"
AUTH_SECRET="$(openssl rand -base64 32)"
APP_URL="http://localhost:3000"
AUTH_TRUST_HOST=true
NEXT_PUBLIC_SHOP_TIMEZONE="America/Sao_Paulo"
SEED_PASSWORD="Mandu@2026"
# Permite as Server Actions através do link de preview do Codespaces
SERVER_ACTIONS_ALLOWED_ORIGINS="*.app.github.dev"
ENV
fi

if [ ! -f .env.test ]; then
  cat > .env.test <<ENV
DATABASE_URL="postgresql://postgres:postgres@db:5432/mrmandu_test?schema=public"
AUTH_SECRET="test-secret-only-for-automated-tests"
NEXT_PUBLIC_SHOP_TIMEZONE="America/Sao_Paulo"
ENV
fi

npm install
npx prisma migrate deploy
npm run db:seed
echo ""
echo "Pronto! O sistema sobe automaticamente na porta 3000 (aba PORTS)."
