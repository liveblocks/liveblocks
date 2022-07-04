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
    # NOTE: This should really just be a simple JQ call, but JQ is unavailable
    # on Vercel environments
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

starts_with () {
    test "${1#$2}" != "$1"
}

get_all_changed_files () {
    if [ ! -f "changed-files.txt" ]; then
        if [ -z "$GITHUB_ACCESS_TOKEN" ]; then
            err "Please set the GITHUB_ACCESS_TOKEN env var for this Vercel project for this to work."
            exit 2
        fi

        # If this is a check on the main branch, then compare the latest commit
        # against the last one. Otherwise this is a PR, and we'll get the file
        # diff against main.
        if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then
          PREV_SHA="main~"
          CURR_SHA="main"
        else
          PREV_SHA="main"
          CURR_SHA="$(git rev-parse HEAD)"
        fi

        curl -s \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: Bearer $GITHUB_ACCESS_TOKEN" \
            "https://api.github.com/repos/liveblocks/liveblocks/compare/${PREV_SHA}...${CURR_SHA}" \
            > diff-since-main.json

        # NOTE: This should really just be a simple JQ call, but JQ is unavailable
        # on Vercel environments
        echo '
        const data = require("./diff-since-main.json");

        // If some commits on this branch have the phrase "[no vercel]" or
        // "[skip examples]" or some combination like that in their message, skip
        // this build
        if (data?.commits?.some(commit => /\[(no|skip).*(vercel|examples|deploy).*\]/i.test(commit.message))) {
            process.exit(0);
        }

        const files = data?.files ?? [];
        for (const file of files) {
            console.log(file.filename);
        }
        ' | node - > changed-files.txt

        rm -f diff-since-main.json
    fi

    cat changed-files.txt
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

if [ $verbose -eq 1 ]; then
    err "--- START of DEBUG output --------------------------"
    err ""
    err "==> All changed files (from Git)"
    get_all_changed_files >&2

    err ""
    err "----------------------------------------------------"
    err "==> Considered interesting (that will be considered)"
    get_interesting_changed_files >&2

    err
    err "----------------------------------------------------"
    err "==> Files that should definitely trigger a rebuild"
    files_that_should_trigger_rebuild >&2

    err
    err "--- END of DEBUG output --------------------------"
fi

if [ "$(files_that_should_trigger_rebuild | wc -l)" -eq 0 ]; then
    if [ $verbose -eq 1 ]; then
        err "Example \"$EXAMPLE\" unaffected by change."
    fi
    rm -f changed-files.txt
    exit 0
else
    if [ $verbose -eq 1 ]; then
        err "⚠️  Example \"$EXAMPLE\" needs rebuild."
        files_that_should_trigger_rebuild >&2
        err
    fi
    rm -f changed-files.txt
    exit 1
fi
