# local-docker-environment

## Purpose

Provide a self-contained local development environment (MongoDB + S3-compatible object storage) that developers can start with a single command, with the application configured entirely via environment variables so the same build can target local or production services without code changes.

## Requirements

### Requirement: One-command local services
The project SHALL provide a `docker-compose.yml` that starts a local MongoDB (`mongo:7`, port 27017) and a local S3-compatible object store (MinIO, ports 9000/9001) with a single command.

#### Scenario: Starting local services
- **WHEN** a developer runs `docker compose up -d` on a fresh clone
- **THEN** MongoDB and MinIO containers start and become healthy

### Requirement: Bucket auto-creation
The local stack SHALL create the `warriors-local` bucket in MinIO automatically on first startup, without any manual step.

#### Scenario: First-run bucket creation
- **WHEN** `docker compose up -d` is run against a MinIO volume that has never been initialized
- **THEN** the `warriors-local` bucket exists in MinIO once the stack finishes starting

#### Scenario: Idempotent restart
- **WHEN** `docker compose up -d` is run again against a MinIO volume where `warriors-local` already exists
- **THEN** startup completes without error and the bucket is unchanged

### Requirement: Data persistence across restarts
Both `mongo` and `minio` services SHALL use named Docker volumes so their data survives a container restart or `docker compose down` (without `-v`) followed by `up`.

#### Scenario: Mongo data survives restart
- **WHEN** data is written to the local MongoDB and the `mongo` service is restarted
- **THEN** the data is still present after restart

#### Scenario: MinIO data survives restart
- **WHEN** an object is written to the `warriors-local` bucket and the `minio` service is restarted
- **THEN** the object is still present after restart

### Requirement: Environment-driven configuration
The project SHALL provide a committed `.env.example` file containing `MONGODB_URI`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` set to values matching the local Docker services. The application SHALL read all Mongo and S3 connection details from environment variables, with no code changes required to point at a different (e.g. production) target.

#### Scenario: Local defaults work out of the box
- **WHEN** a developer copies `.env.example` to `.env.local` without editing it and the Docker services are running
- **THEN** the app connects to the local MongoDB and MinIO using those values

#### Scenario: Switching target requires only env changes
- **WHEN** the values of `MONGODB_URI`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are replaced with production values
- **THEN** the same build connects to the production database and bucket with no source code changes

### Requirement: Connectivity health check
The application SHALL expose a health check that verifies it can connect to both MongoDB and the configured S3-compatible storage, reporting per-service status.

#### Scenario: All services reachable
- **WHEN** the health check is invoked while MongoDB and MinIO are both running and reachable
- **THEN** it reports success for both services

#### Scenario: A service is unreachable
- **WHEN** the health check is invoked while MongoDB or MinIO is not reachable
- **THEN** it reports failure for the unreachable service without failing silently
