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
        npx gen-esm-wrapper "$DIST/index.js" "$DIST/index.mjs"
    fi
}

main () {
    generate_esm_wrappers

    # Copy these files into the distribution
    cp "$ROOT/LICENSE" ./README.md "$DIST/"

    # Strip keys from package.json and place the result in dist/
    echo '
    const data = require("./package.json");

    data.type = undefined;
    data.private = undefined;
    data.scripts = undefined;
    data.files = undefined;
    data.devDependencies = undefined;
    data.optionalDependencies = undefined;
    data.jest = undefined;
    data.prettier = undefined;
    data.tsup = undefined;

    console.log(JSON.stringify(data));
    ' | node - > "$DIST/package.json"

    node_modules/.bin/prettier --write "$DIST/package.json"
}

if [ ! -f "./package.json" ]; then
    err "This script should be run from inside a package directory"
    exit 1
fi

if [ -d lib ]; then
    # Clean up legacy build outputs that used to get written to
    # lib/ instead of dist/
    rm -rf lib
fi

main
