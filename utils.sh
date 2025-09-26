#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
DEVELOPMENT_DIR="${PROJECT_ROOT}/development"
BASE_COMPOSE_FILE="${DEVELOPMENT_DIR}/docker-compose.yml"

INFRA_SERVICES=(
  event-sourcing-event-store
  event-sourcing-projection-store
  event-sourcing-email-server
  event-sourcing-file-storage
  event-sourcing-event-bus
)

usage() {
cat <<'EOF'
  Usage: ./utils.sh <command>

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
  "${DOCKER_COMPOSE[@]}" --project-directory "${DEVELOPMENT_DIR}" "${files[@]}" "$@"
}

make_local_compose_override() {
  require_command npx

  local tmp_override
  tmp_override=$(mktemp 2>/dev/null || mktemp -t docker-compose.local.override)

  local override_json
  override_json='{
    "services": {
      "event-sourcing-event-store": {
        "ports": [ "5432:5432" ]
      },
      "event-sourcing-projection-store": {
        "ports": [ "27017:27017" ]
      },
      "event-sourcing-email-server": {
        "ports": [ "1025:1025" ]
      },
      "event-sourcing-event-bus": {
        "depends_on": {
          "event-sourcing-event-store": { "condition": "service_healthy" }
        }
      }
    }
  }'

  if ! echo "${override_json}" | npx yaml >"${tmp_override}" 2>/dev/null; then
    echo "Error: Failed to generate docker compose override via YAML CLI." >&2
    return 1
  fi

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

  trap '[[ -n "${local_override}" && -f "${local_override}" ]] && rm -f "${local_override}"' EXIT

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
  echo "Starting backend with local environment..."
  (cd "${PROJECT_ROOT}" && npm run watch)
}

command_run() {
  start_infra
  run_backend
}

command_infra_up() {
  start_infra
}

command_infra_down() {
  echo "Stopping infrastructure..."

  local local_override
  local_override=$(make_local_compose_override)
  trap '[[ -n "${local_override}" && -f "${local_override}" ]] && rm -f "${local_override}"' EXIT

  stop_infra
  echo "Infrastructure stopped."
}

command_infra_status() {
  local local_override
  local_override=$(make_local_compose_override)
  trap '[[ -n "${local_override}" && -f "${local_override}" ]] && rm -f "${local_override}"' EXIT

  infra_status
}

main() {
  if [[ $# -eq 0 ]]; then
    usage
    exit 0
  fi

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
