#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"

# Target dir to place file into
DIST="dist"

err () {
    echo "$@" >&2
}

generate_esm_wrappers () {
    if [ -f "$DIST/index.js" ]; then
        "$ROOT/node_modules/.bin/gen-esm-wrapper" "$DIST/index.js" "$DIST/index.mjs"
    fi
}

main () {
    generate_esm_wrappers
}

if [ ! -f "./package.json" ]; then
    err "This script should be run from inside a package directory"
    exit 1
fi

main
