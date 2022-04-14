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
    err "usage: for-all-packages.sh [-qfh] <cmd> [<arg1> [<arg2> ...]]"
    err
    err "Runs the given script inside all of our package directories."
    err
    err "Options:"
    err "-q    Don't print the current directory"
    err "-f    Continue, even after an error occurs"
    err "-h    Show this help"
}

quiet=0
force=0
while getopts qfh flag; do
    case "$flag" in
        q) quiet=1 ; ;;
        f) force=1 ; ;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

for dir in $(find packages -maxdepth 1 -type d | grep -Ee /); do
    if [ $quiet -eq 0 ]; then
        err
        err "==> In $dir"
    fi

    ( cd "$dir" && (
        if [ $force -eq 1 ]; then
            set +e
        fi

        # Run the given command
        "$@"

        if [ $force -eq 1 ]; then
            set -e
        fi
    ) )
done
