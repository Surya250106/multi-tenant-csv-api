#!/usr/bin/env bash
set -e

echo "========================================="
echo " Multi-Tenant CSV API - Test Suite"
echo "========================================="

# Ensure required environment variables for tests
export PORT=${PORT:-3000}
export DATABASE_HOST=${DATABASE_HOST:-localhost}
export DATABASE_PORT=${DATABASE_PORT:-5432}
export DATABASE_NAME=${DATABASE_NAME:-multitenant}
export DATABASE_USER=${DATABASE_USER:-postgres}
export DATABASE_PASSWORD=${DATABASE_PASSWORD:-postgres}
export JWT_SECRET=${JWT_SECRET:-super-secret-jwt-key-for-development}
export JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-1h}
export NODE_ENV=test

# Check if database is reachable; if not and docker is available, start docker db service
if ! command -v nc >/dev/null 2>&1 && ! command -v pg_isready >/dev/null 2>&1; then
  echo "Checking database availability..."
fi

# If running inside docker container or standalone host
echo "Starting test suite with Jest..."
npx jest --runInBand --detectOpenHandles --forceExit

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "========================================="
  echo " ALL TESTS PASSED SUCCESSFULLY"
  echo "========================================="
else
  echo "========================================="
  echo " TESTS FAILED (Exit code: $TEST_EXIT_CODE)"
  echo "========================================="
fi

exit $TEST_EXIT_CODE
