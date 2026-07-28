#!/usr/bin/env bash
set -euo pipefail

# One-time environment setup and integrity verification for FootStep.

# --- Setup ---

echo "==> Spinning up infrastructure..."
docker compose up --build -d

echo "==> Waiting for postgres to be healthy..."
RETRIES=30
until docker compose exec postgres pg_isready -U footstep > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: postgres did not become healthy in time."
    exit 1
  fi
  sleep 2
done
echo "    postgres is ready."

echo "==> Running migrations..."
docker compose exec backend uv run python manage.py migrate --noinput

echo "==> Collecting static files..."
docker compose exec backend uv run python manage.py collectstatic --noinput

# --- Verification ---

echo ""
echo "==> Verifying containers..."
for service in backend frontend postgres; do
  if docker compose ps "$service" --status running -q 2>/dev/null | grep -q .; then
    echo "    $service is running"
  else
    echo "ERROR: $service is not running"
    docker compose ps
    exit 1
  fi
done

echo ""
echo "==> Health checks..."

RETRIES=10
until curl -sf http://localhost:8000/admin/login/ > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: backend health check failed (http://localhost:8000/admin/login/)"
    docker compose logs backend --tail 10
    exit 1
  fi
  sleep 2
done
echo "    backend responds at http://localhost:8000"

RETRIES=15
until curl -sf http://localhost:4321/ > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "ERROR: frontend health check failed (http://localhost:4321/)"
    docker compose logs frontend --tail 10
    exit 1
  fi
  sleep 2
done
echo "    frontend responds at http://localhost:4321"

echo ""
echo "==> Auditing logs (last 5 lines each)..."
echo "--- Backend ---"
docker compose logs backend --tail 5 2>&1
echo ""
echo "--- Frontend ---"
docker compose logs frontend --tail 5 2>&1
echo ""
echo "--- Postgres ---"
docker compose logs postgres --tail 5 2>&1

echo ""
echo "==> All checks passed. Environment is ready."
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:4321"
echo "   Postgres: localhost:5432"
