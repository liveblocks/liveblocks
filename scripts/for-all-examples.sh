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
    err "usage: for-all-examples.sh [-qfh] [-c <shell-cmd>] <cmd> [<arg1> [<arg2> ...]]"
    err
    err "Runs the given script inside all of our examples directories."
    err
    err "Options:"
    err "-q    Don't print the current directory"
    err "-f    Continue, even after an error occurs"
    err "-c    Run command with \`sh -c\` instead"
    err "-h    Show this help"
}

cmd=
quiet=0
force=0
while getopts qc:fh flag; do
    case "$flag" in
        c) cmd="$OPTARG" ; ;;
        q) quiet=1 ; ;;
        f) force=1 ; ;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

for dir in $(find examples starter-kits -maxdepth 1 -type d | grep -Ee /); do
    if [ $quiet -eq 0 ]; then
        err
        err "==> In $dir"
    fi

    ( cd "$dir" && (
        if [ $force -eq 1 ]; then
            set +e
        fi

        # Run the given command
        if [ -n "$cmd" ]; then
            sh -c "$cmd"
        else
            "$@"
        fi

        if [ $force -eq 1 ]; then
            set -e
        fi
    ) )
done
