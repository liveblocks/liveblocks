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

gen_esm_wrapper () {
    infile="$1"
    outfile="$2"

    ( cd "$DIST" && (
      (
        echo "export {"
        grep -oEe 'exports[.]([^=]+)\=' "$infile" | cut -d. -f2 | cut -d' ' -f1 | sed -Ee 's/$/&,/'
        echo "} from \"./$infile\""
      ) > "$outfile"

      prettier --write "$outfile"

      # Test if output "runs" in Node
      node "$outfile"
    ) )
}

generate_esm_wrappers () {
    if [ -f "$DIST/internal.js" ]; then
        gen_esm_wrapper "internal.js" "internal.mjs"
    fi

    if [ -f "$DIST/index.js" ]; then
        gen_esm_wrapper "index.js" "index.mjs"
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
