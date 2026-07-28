#!/bin/sh
set -eu
CDPATH=''  # Don't let inherited CDPATHs hijack our relative cd's

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
    err "usage: for-all-examples.sh [-pqfh] [-c <shell-cmd>] <cmd> [<arg1> [<arg2> ...]]"
    err
    err "Runs the given script inside all of our examples directories."
    err
    err "Options:"
    err "-p    Run up to 8 commands in parallel and buffer their output"
    err "-q    Don't print the current directory"
    err "-f    Continue, even after an error occurs"
    err "-c    Run command with \`sh -c\` instead"
    err "-h    Show this help"
}

cmd=
parallel=0
quiet=0
force=0
while getopts pqc:fh flag; do
    case "$flag" in
        c) cmd="$OPTARG" ; ;;
        p) parallel=1 ; ;;
        q) quiet=1 ; ;;
        f) force=1 ; ;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

run_in_dir () {
    dir="$1"
    shift

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
}

if [ $parallel -eq 0 ]; then
    for dir in $(find examples starter-kits -maxdepth 1 -type d | grep -Ee /); do
        run_in_dir "$dir" "$@"
    done
    exit
fi

output_dir="$(mktemp -d)"
trap 'rm -r "$output_dir"' 0
trap 'exit 1' 1 2 15

jobs=
active_jobs=0
output_index=0

flush_jobs () {
    failed=0

    for job in $jobs; do
        pid="${job%%:*}"
        output_file="${job#*:}"

        if ! wait "$pid"; then
            failed=1
        fi

        cat "$output_file"
        rm "$output_file"
    done

    jobs=
    active_jobs=0
    return "$failed"
}

for dir in $(find examples starter-kits -maxdepth 1 -type d | grep -Ee /); do
    output_file="$output_dir/$output_index"
    run_in_dir "$dir" "$@" > "$output_file" 2>&1 &
    jobs="$jobs $!:$output_file"
    active_jobs=$((active_jobs + 1))
    output_index=$((output_index + 1))

    if [ $active_jobs -eq 8 ]; then
        flush_jobs
    fi
done

if [ $active_jobs -gt 0 ]; then
    flush_jobs
fi
