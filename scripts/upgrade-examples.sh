#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"
if [ "$(pwd)" != "$ROOT" ]; then
    ( cd "$ROOT" && exec "$0" "$@" )
    exit $?
fi

err () {
    echo "$@" >&2
}

usage () {
    err "usage: upgrade-examples.sh [<version>]"
    err
    err "Upgrades all the example projects by bumping the Liveblocks dependencies"
    err "to the given version. If not provided, uses the latest version."
    err
    err "Options:"
    err "-h    Show this help"
}

while getopts h flag; do
    case "$flag" in
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

VERSION="${1:-latest}"

list_all_projects () {
    find examples e2e \
        -type d '(' -name node_modules -o -name .next ')' -prune \
        -o \
        -name package.json \
        | grep -Ee package.json \
        | xargs -n1 dirname
}

list_liveblocks_deps () {
    for dep in $(jq -r '(.dependencies // {})|keys[]' package.json | grep -Ee '^@liveblocks/'); do
        # Skip dependencies that are explicitly pinned to "*"
        if [ "$(jq -r ".dependencies.\"$dep\"" package.json)" != "*" ]; then
            echo "$dep"
        fi
    done
}

list_install_args () {
    for dep in $(list_liveblocks_deps); do
        echo "$dep@$VERSION"
    done
}

for proj in $(list_all_projects); do
    echo "==> Upgrade $proj to $VERSION"
    ( cd "$proj" && npm install $(list_install_args ) )
done
