#!/usr/bin/env bash
set -euo pipefail

# `docker compose up -d --wait` exits non-zero even when everything succeeds,
# because the one-shot mongo-seed/minio-init containers finish and exit(0),
# which `--wait` treats as "not running" rather than "completed successfully".
# Bring the stack up, then verify actual container state explicitly instead
# of trusting that exit code.
docker compose up -d --wait || true

fail=0

for svc in mongo minio; do
  cid="$(docker compose ps -a -q "$svc")"
  status="$(docker inspect -f '{{.State.Health.Status}}' "$cid")"
  if [ "$status" != "healthy" ]; then
    echo "::error::$svc is not healthy (status: $status)"
    fail=1
  fi
done

for svc in mongo-seed minio-init; do
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

echo "All services healthy and seeded."
