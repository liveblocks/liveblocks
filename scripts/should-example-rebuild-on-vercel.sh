#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"
if [ "$(pwd)" != "$ROOT" ]; then
    ARG0="$(realpath --relative-to="$ROOT" "$0")"
    ( cd "$ROOT" && exec "$ARG0" "$@" )
    exit $?
fi

err () {
    echo "$@" >&2
}

usage () {
    err "usage: should-example-rebuild-on-vercel.sh [-h] <example-name>"
    err
    err "Returns a 0 or 1 exit code, indicating whether the given example should be redeployed."
    err
    err "Options:"
    err "-v    Be verbose"
    err "-h    Show this help"
}

verbose=0
while getopts vh flag; do
    case "$flag" in
        v) verbose=1 ;;
        h) usage; exit 0;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

if [ "$#" -lt 1 ]; then
    usage
    exit 2
elif [ "$#" -gt 1 ]; then
    shift 1
    err "Superfluous arguments: $@"
    usage
    exit 2
fi

EXAMPLE="${1%/}"

if [ ! -d "examples/$EXAMPLE" ]; then
    err "Unknown example: $EXAMPLE"
    err "Valid examples are:"
    ls examples/ | cat >&2
    exit 2
fi

list_dependencies () {
    echo '
      const config = require("./package.json");
      const deps = new Set([
          ...(Object.keys(config?.dependencies ?? {})),
      ]);
      for (const dep of deps) {
          console.log(dep);
      }
    ' | node -
}

make_relative () {
    while read f; do
        echo "$(realpath --relative-to=. "$ROOT/$f")"
    done
}

starts_with () {
    test "${1#$2}" != "$1"
}

get_all_changed_files () {
    git diff --stat --name-only HEAD~1...HEAD -- | make_relative
    #                           ^^^^^^^^^^^^^
    #                           Should ideally be origin/main...HEAD, but
    #                           Vercel does not allow us to do that, because
    #                           they only take a shallow clone and strip all
    #                           branch and remote information from their local
    #                           Git checkouts.
}

#
# We're only interested in checking the examples and packages folders, ignore
# any other changed files.
#
get_interesting_changed_files () {
    get_all_changed_files \
      | grep -Ee '^(examples|packages)/' \
      | grep -vEe "/[.]" \
      | grep -vEe "(\.md)\$" \
      | grep -vEe "\b(test|jest)\b"
}

make_filter_pattern () {
    PAT="(examples/$EXAMPLE"

    for dep in $( cd "examples/$EXAMPLE" && list_dependencies ); do
        if starts_with "$dep" "@liveblocks/"; then
            PAT="$PAT|packages/liveblocks-${dep#@liveblocks/}"
        fi
    done

    PAT="$PAT)"
    echo $PAT
}

files_that_should_trigger_rebuild () {
    get_interesting_changed_files \
        | grep -Ee "$(make_filter_pattern)"
}

if [ "$(files_that_should_trigger_rebuild | wc -l)" -eq 0 ]; then
    if [ $verbose -eq 1 ]; then
        err "Example \"$EXAMPLE\" unaffected by change."
    fi
    exit 0
else
    if [ $verbose -eq 1 ]; then
        err "⚠️  Example \"$EXAMPLE\" needs rebuild."
        files_that_should_trigger_rebuild >&2
        err
    fi
    exit 1
fi
