#!/usr/bin/env bash
set -euo pipefail

GENERATOR_VERSION="0.28.2"  # The pinned version of the generator
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_PATH="$SCRIPT_DIR/../../docs/references/v2.openapi.json"

cd "$SCRIPT_DIR"

uvx "openapi-python-client@${GENERATOR_VERSION}" generate \
  --path "$SPEC_PATH" \
  --config config.yaml \
  --output-path . \
  --custom-template-path templates \
  --meta uv \
  --overwrite