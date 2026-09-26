#!/usr/bin/env bash
set -euo pipefail

# `docker compose up -d --wait` exits non-zero even when everything succeeds,
# because the one-shot mongo-seed/minio-init containers finish and exit(0),
# which `--wait` treats as "not running" rather than "completed successfully".
# Bring the stack up, then verify actual container state explicitly instead
# of trusting that exit code.
docker compose up -d --wait || true

fail=0

for svc in mongo localstack; do
  cid="$(docker compose ps -a -q "$svc")"
  status="$(docker inspect -f '{{.State.Health.Status}}' "$cid")"
  if [ "$status" != "healthy" ]; then
    echo "::error::$svc is not healthy (status: $status)"
    fail=1
  fi
done

for svc in mongo-seed; do
  cid="$(docker compose ps -a -q "$svc")"
  code="$(docker inspect -f '{{.State.ExitCode}}' "$cid")"
  if [ "$code" != "0" ]; then
    echo "::error::$svc exited with code $code"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  docker compose logs
  exit 1
fi

# Create the S3 bucket inside LocalStack now that it's healthy.
# awslocal is in PATH inside the container; this is more reliable than an
# init-hooks script (which requires the file to be executable on the host).
cid="$(docker compose ps -q localstack)"
docker exec "$cid" awslocal s3 mb s3://warriors-local 2>/dev/null || true

echo "All services healthy and seeded."
