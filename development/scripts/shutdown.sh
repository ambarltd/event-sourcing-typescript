#!/bin/bash
set -e

SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/../../" && pwd)

cd "${SCRIPT_DIR}/../"

docker compose down