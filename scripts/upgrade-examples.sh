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

scripts/for-all-examples.sh -c "npx -y liveblocks@latest upgrade $VERSION" -f
