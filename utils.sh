#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
DEV_DIR="${PROJECT_ROOT}/development"

BASE_COMPOSE_FILE="${DEV_DIR}/docker-compose.yml"
OVERRIDE_COMPOSE_FILE="" # set when running locally

INFRA_SERVICES=(
  event-sourcing-backend-proxy
  event-sourcing-event-store
  event-sourcing-projection-store
  event-sourcing-email-server
  event-sourcing-file-storage
  event-sourcing-event-bus
)

usage() {
cat <<'EOF'
  Usage: ./utils.sh [options] <command>

  Options:
    -q, --quiet    Suppress verbose output from docker and services
    -v, --verbose  Enable verbose output (default)
    --log-level    Set backend log level (error|warn|info|debug, default: info)

  Commands:
  run          Start infrastructure containers and run the backend locally
  infra-up     Start only the supporting infrastructure containers
  infra-down   Stop and remove the supporting infrastructure containers
  infra-status Show status for the supporting infrastructure containers
  help         Display this help message
EOF
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' not found in PATH." >&2
    exit 1
  fi
}

init_compose_command() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
  else
    echo "Error: docker compose is required." >&2
    exit 1
  fi
}

compose_cmd() {
  local files=( -f "${BASE_COMPOSE_FILE}" )
  if [[ -n "${OVERRIDE_COMPOSE_FILE}" && -f "${OVERRIDE_COMPOSE_FILE}" ]]; then
    files+=( -f "${OVERRIDE_COMPOSE_FILE}" )
  fi
  "${DOCKER_COMPOSE[@]}" --project-directory "${DEV_DIR}" "${files[@]}" "$@"
}

load_docker_compose_env() {
  # Load environment variables from docker-compose.yml
  local compose_file="development/docker-compose.yml"

  if [[ ! -f "${compose_file}" ]]; then
    echo "Error: Docker compose file not found at ${compose_file}" >&2
    return 1
  fi

  # Check if required tools are available
  if ! command -v npx >/dev/null 2>&1; then
    echo "Error: npx not found. Please ensure Node.js is installed." >&2
    return 1
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq not found. Please install jq for JSON processing." >&2
    return 1
  fi

  # Extract environment variables from docker-compose.yml
  local env_vars
  env_vars=$(npx yaml --json < "${compose_file}" 2>/dev/null | \
    jq -r '.[0].services."event-sourcing-backend".environment | to_entries[] | "\(.key)=\(.value)"' 2>/dev/null)

  if [[ $? -ne 0 || -z "$env_vars" ]]; then
    echo "Error: Failed to parse docker-compose.yml or extract environment variables." >&2
    return 1
  fi

  # Process and export each environment variable
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Parse KEY=VALUE format
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"

      # Remove surrounding quotes if present
      if [[ "$value" =~ ^[\"\'](.*)[\"\']$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "$key"="$value"
    fi
  done <<< "$env_vars"
}

set_backend_env() {
  export NODE_ENV="${NODE_ENV:-development}"

  export AMBAR_HTTP_USERNAME="${AMBAR_HTTP_USERNAME:-username}"
  export AMBAR_HTTP_PASSWORD="${AMBAR_HTTP_PASSWORD:-password}"

  export EVENT_STORE_HOST="${EVENT_STORE_HOST:-localhost}"
  export EVENT_STORE_PORT="${EVENT_STORE_PORT:-5432}"
  export EVENT_STORE_DATABASE_NAME="${EVENT_STORE_DATABASE_NAME:-my_es_database}"
  export EVENT_STORE_USER="${EVENT_STORE_USER:-my_es_username}"
  export EVENT_STORE_PASSWORD="${EVENT_STORE_PASSWORD:-my_es_password}"
  export EVENT_STORE_CREATE_TABLE_WITH_NAME="${EVENT_STORE_CREATE_TABLE_WITH_NAME:-event_store}"
  export EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME="${EVENT_STORE_CREATE_REPLICATION_USER_WITH_USERNAME:-replication_username}"
  export EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD="${EVENT_STORE_CREATE_REPLICATION_USER_WITH_PASSWORD:-replication_password}"
  export EVENT_STORE_CREATE_REPLICATION_PUBLICATION="${EVENT_STORE_CREATE_REPLICATION_PUBLICATION:-replication_publication}"

  export MONGODB_PROJECTION_DATABASE_USERNAME="${MONGODB_PROJECTION_DATABASE_USERNAME:-my_mongo_username}"
  export MONGODB_PROJECTION_DATABASE_PASSWORD="${MONGODB_PROJECTION_DATABASE_PASSWORD:-my_mongo_password}"
  export MONGODB_PROJECTION_HOST="${MONGODB_PROJECTION_HOST:-localhost}"
  export MONGODB_PROJECTION_PORT="${MONGODB_PROJECTION_PORT:-27017}"
  export MONGODB_PROJECTION_DATABASE_NAME="${MONGODB_PROJECTION_DATABASE_NAME:-projections}"

  export SMTP_HOST="${SMTP_HOST:-localhost}"
  export SMTP_PORT="${SMTP_PORT:-1025}"
  export SMTP_USERNAME="${SMTP_USERNAME:-smtp_username}"
  export SMTP_PASSWORD="${SMTP_PASSWORD:-smtp_password}"
  export SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-no-reply@example.localdevelopment}"

  export S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-http://localhost:7999}"
  export S3_ACCESS_KEY="${S3_ACCESS_KEY:-user}"
  export S3_SECRET_KEY="${S3_SECRET_KEY:-password}"
  export S3_BUCKET_NAME="${S3_BUCKET_NAME:-administrator-files}"
  export S3_REGION="${S3_REGION:-us-east-1}"
}

# Build a temporary compose override that:
# - Publishes DB ports for local connections
# - Adds host alias inside event-bus
# - Adds a backend proxy container to forward to host backend
make_local_compose_override() {
  local tmp_override
  # Create a unique temporary file in a cross-platform way
  tmp_override=$(mktemp 2>/dev/null || mktemp -t docker-compose.local.override)
  cat >"${tmp_override}" <<YAML
services:
  event-sourcing-backend-proxy:
    container_name: event-sourcing-backend-proxy
    image: alpine:3.19
    command: ["/bin/sh", "-c", "apk add --no-cache socat && socat TCP-LISTEN:8080,bind=172.95.0.11,fork,reuseaddr TCP:host.docker.internal:8080"]
    restart: always
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD-SHELL", "netstat -ln | grep ':8080'"]
      timeout: 2s
      interval: 5s
      retries: 10
      start_period: 10s
    networks:
      event-sourcing:
        ipv4_address: 172.95.0.11
  event-sourcing-event-store:
    ports:
      - "5432:5432"
  event-sourcing-projection-store:
    ports:
      - "27017:27017"
  event-sourcing-email-server:
    ports:
      - "1025:1025"
YAML
  echo "${tmp_override}"
}

wait_for_container() {
  local container="$1"
  local retries=30

  while (( retries > 0 )); do
    local status
    if ! status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null); then
      sleep 1
      ((retries--))
      continue
    fi

    if [[ "$status" == "healthy" ]]; then
      echo "${container} is healthy"
      return 0
    elif [[ "$status" == "running" ]]; then
      # For containers without health checks, running is sufficient
      echo "${container} is running"
      return 0
    elif [[ "$status" == "exited" ]]; then
      echo "Error: ${container} has exited" >&2
      exit 1
    fi

    echo "Waiting for ${container} (status: ${status})..."
    sleep 2
    ((retries--))
  done

  echo "Error: Timed out waiting for ${container} to start properly." >&2
  exit 1
}

wait_for_infra() {
  echo "Checking container status..."
  for container in "${INFRA_SERVICES[@]}"; do
    wait_for_container "$container"
  done
  echo ""
  echo "All infrastructure containers are running successfully!"
}

start_infra() {
  local local_override
  local_override=$(make_local_compose_override)
  OVERRIDE_COMPOSE_FILE="${local_override}"

  # Cleanup temporary override on exit
  trap '[[ -n "${OVERRIDE_COMPOSE_FILE}" && -f "${OVERRIDE_COMPOSE_FILE}" ]] && rm -f "${OVERRIDE_COMPOSE_FILE}"' EXIT

  # Start only the infra services, ignoring backend deps
  compose_cmd up -d --no-deps "${INFRA_SERVICES[@]}"
  wait_for_infra
}

stop_infra() {
  compose_cmd stop "${INFRA_SERVICES[@]}" >/dev/null 2>&1 || true
  compose_cmd rm -f "${INFRA_SERVICES[@]}" >/dev/null 2>&1 || true
}

infra_status() {
  compose_cmd ps --format "table {{.Name}}\t{{.Status}}"
}

run_backend() {
  echo "Loading environment variables from docker-compose.yml..."
  load_docker_compose_env

  # Override database hosts for local development
  export EVENT_STORE_HOST="localhost"
  export MONGODB_PROJECTION_HOST="localhost"
  export SMTP_HOST="localhost"
  export S3_ENDPOINT_URL="http://localhost:7999"

  set_backend_env
  echo "Starting backend with local environment..."
  (cd "${PROJECT_ROOT}" && npm run start)
}

command_run() {
  start_infra
  echo "Infrastructure is ready."
  echo "Press Ctrl+C to stop the backend. Infrastructure containers will keep running."
  run_backend
}

command_infra_up() {
  start_infra
}

command_infra_down() {
  # Ensure override exists so compose knows about the proxy service
  local local_override
  local_override=$(make_local_compose_override)
  OVERRIDE_COMPOSE_FILE="${local_override}"
  trap '[[ -n "${OVERRIDE_COMPOSE_FILE}" && -f "${OVERRIDE_COMPOSE_FILE}" ]] && rm -f "${OVERRIDE_COMPOSE_FILE}"' EXIT

  stop_infra
  echo "Infrastructure stopped."
}

command_infra_status() {
  # Ensure override exists so compose is aware of all services
  local local_override
  local_override=$(make_local_compose_override)
  OVERRIDE_COMPOSE_FILE="${local_override}"
  trap '[[ -n "${OVERRIDE_COMPOSE_FILE}" && -f "${OVERRIDE_COMPOSE_FILE}" ]] && rm -f "${OVERRIDE_COMPOSE_FILE}"' EXIT

  infra_status
}

main() {
  require_command docker
  init_compose_command

  local command="${1:-help}"
  shift || true

  case "$command" in
    run)
      command_run "$@"
      ;;
    infra-up)
      command_infra_up "$@"
      ;;
    infra-down)
      command_infra_down "$@"
      ;;
    infra-status)
      command_infra_status "$@"
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
