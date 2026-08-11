#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

npm install
npx prisma generate

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker compose up -d postgres redis
  echo "Waiting for Postgres..."
  sleep 3
  npx prisma migrate deploy
  npm run db:seed
  echo "Ready. Run: npm run dev"
else
  echo "Docker is not available."
  echo "Start Postgres/Redis yourself, then run:"
  echo "  npx prisma migrate deploy && npm run db:seed && npm run dev"
fi
