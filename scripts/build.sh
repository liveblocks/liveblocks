#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"
if [ ! -f "./package.json" ]; then
    echo "This script should be run from inside a package directory" >&2
    exit 1
fi

# Target dir to place file into
DIST="lib"

check_jq_installed () {
    if ! which -s jq; then
        err ""
        err "jq is not installed."
        err ""
        err "You can find it at:"
        err "  https://stedolan.github.io/jq/"
        err ""
        err "Please run:"
        err "  brew install jq"
        err ""
        exit 2
    fi
}

main () {
    check_jq_installed

    # Copy these files into the distribution
    cp "$ROOT/LICENSE" ./README.md "$DIST/"

    # Strip keys from package.json and place the result in lib/
    cat package.json                     | \
        jq 'del(.type)'                    \
        jq 'del(.private)'               | \
        jq 'del(.scripts)'               | \
        jq 'del(.files)'                 | \
        jq 'del(.devDependencies)'       | \
        jq 'del(.optionalDependencies)'  | \
        jq 'del(.jest)'                  | \
        jq 'del(.prettier)'              | \
            > "$DIST/package.json"

    prettier --write "$DIST/package.json"
}

main
