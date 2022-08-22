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

use_explicit_cjs_extensions () {
    # Small correction: our Rollup plugins generare Common JS files with the
    # *.js extension, but module resolvers are allowed to interpret those as
    # either CJS or ESM files, depending on the project's own configuration.
    # Let's rename these to *.cjs extensions explicitly, so they're not
    # dependent on the parent project's configuration.
    set +e
    shopt -s nullglob
    set -e

    # Replace any require('./foo.js') by require('./foo.cjs'), and rename the
    # file extensions at the same time
    for f in "$DIST/"*.js; do
        sed -Ee 's/[.]js"/.cjs"/' "$f" > "${f%.js}.cjs"
    done
    rm "$DIST/"*.js
}

generate_esm_wrappers () {
    if [ -f "$DIST/internal.cjs" ]; then
        npx gen-esm-wrapper "$DIST/internal.cjs" "$DIST/internal.mjs"
    fi

    if [ -f "$DIST/index.cjs" ]; then
        npx gen-esm-wrapper "$DIST/index.cjs" "$DIST/index.mjs"
    fi
}

main () {
    use_explicit_cjs_extensions
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
