#!/bin/sh
set -eu

LIVEBLOCKS_ROOT="$(realpath "$(dirname "$0")/..")"

err () {
    echo "$@" >&2
}

starts_with () {
    test "${1#$2}" != "$1"
}

usage () {
    err "usage: link-liveblocks.sh [-h] [<project-root>]"
    err
    err "Links the NPM project in the current directory to use the local Liveblocks"
    err "codebase instead of the one currently published to NPM."
    err
    err "Options:"
    err "-h            Show this help"
}

while getopts h flag; do
    case "$flag" in
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

THIS_SCRIPT="$0"
if [ $# -eq 1 ]; then
    PROJECT_ROOT="$(realpath "$1")"
elif [ $# -eq 0 ]; then
    # If this script is invoked without the second argument, re-invoke itself with
    # the current directory as an explicit argument.
    exec "$THIS_SCRIPT" "$(pwd)"
    exit $?
else
    usage
    exit 2
fi

if [ ! -d "$LIVEBLOCKS_ROOT/packages/liveblocks-client" ]; then
    err "$LIVEBLOCKS_ROOT: not a valid checkout of the liveblocks repo."
    exit 2
fi

# Depending on whether this script is run for a project or for another library,
# we'll need to perform linking differently
if starts_with "$(pwd)" "$LIVEBLOCKS_ROOT/packages"; then
    IS_PROJECT=0
else
    IS_PROJECT=1
fi

# Global that points to the node_modules folder of the current package, to
# backlink peer dependencies into
PROJECT_PACKAGE_JSON="$PROJECT_ROOT/package.json"
PROJECT_NODE_MODULES_ROOT="$PROJECT_ROOT/node_modules"

if [ ! -f "$PROJECT_PACKAGE_JSON" ]; then
    err "Cannot find file $PROJECT_PACKAGE_JSON"
    err "Please run this script from inside a library or project directory."
    exit 2
fi

# Returns the modification timestamp for the oldest file found in the given
# files or directories
oldest_file () {
    find "$@" -type f -print0 | xargs -0 stat -f%m | sort -r | head -n 1
}

# Returns the modification timestamp for the youngest file found in the given
# files or directories
youngest_file () {
    find "$@" -type f -print0 | xargs -0 stat -f%m | sort | head -n 1
}

list_dependencies () {
    jq -r '((.dependencies // {}) + (.devDependencies // {}) + (.peerDependencies // {})) | keys[]' package.json
}

list_liveblocks_dependencies () {
    list_dependencies | grep -Ee '^@liveblocks/'
}

list_liveblocks_and_peer_dependencies_ () {
    list_liveblocks_dependencies
    for dep in $(jq -r '(.peerDependencies // {}) | keys[]' package.json); do
        if starts_with "$dep" "@liveblocks/"; then
            continue
        fi

        RELPATH="$(realpath --relative-to=. "$PROJECT_NODE_MODULES_ROOT")/$dep"
        if starts_with "$RELPATH" ".."; then
            echo "$RELPATH"
        fi
    done
}

list_liveblocks_and_peer_dependencies () {
    list_liveblocks_and_peer_dependencies_ | sort -u
}

# Like `npm install`, but don't show any output unless there's an error
npm_install () {
    logfile="$(mktemp)"
    if ! npm install "$@" > "$logfile" 2> "$logfile"; then
        cat "$logfile" >&2
        err ""
        err "^^^ Errors happened during \`npm install\` in $(pwd)."
        exit 2
    fi
}

# Like `npm link`, but don't show any output unless there's an error
npm_link () {
    logfile="$(mktemp)"
    if ! npm link "$@" > "$logfile" 2> "$logfile"; then
        cat "$logfile" >&2
        err ""
        err "^^^ Errors happened during \`npm link\` in $(pwd)."
        exit 2
    fi
}

# Given a pkg name like "@liveblocks/client", returns "$LIVEBLOCKS_ROOT/packages/liveblocks-client"
liveblocks_pkg_dir () {
    echo "$LIVEBLOCKS_ROOT/packages/liveblocks-${1#@liveblocks/}"
}

prep_liveblocks_deps () {
    for pkg in $(list_liveblocks_dependencies); do
        # We're trying to link the local package to a Liveblocks dependency.
        # This means we'll first have to build that, and then create a symlink
        # to it.

        # Now cd into the package directory, and rebuild it while linking the
        # peer dependency to the project directory
        ( cd "$(liveblocks_pkg_dir "$pkg")" && (
            # Invoke this script to first build the other dependency correctly
            "$THIS_SCRIPT" "$PROJECT_ROOT"

            # Register this link
            npm_link
        ) )
    done
}

# Links a Liveblocks peer dependency (must link locally)
link_liveblocks_deps () {
    if [ "$(list_liveblocks_dependencies | wc -l)" -eq 0 ]; then
        # No peer dependencies, we can quit early
        return
    fi

    echo "==> Linking Liveblocks dependencies"
    npm_link $(list_liveblocks_dependencies)
}

# Links another/normal peer dependency (must link to project's node_modules
# directly)
link_liveblocks_and_peer_deps () {
    if [ "$(list_liveblocks_and_peer_dependencies | wc -l)" -eq 0 ]; then
        # No peer dependencies, we can quit early
        return
    fi

    echo "==> Linking Liveblocks & peer dependencies"
    npm_link $(list_liveblocks_and_peer_dependencies)
}

rebuild_if_needed () {
    # Update dependencies
    npm_install

    # Link necessary peer dependencies
    prep_liveblocks_deps
    if [ $IS_PROJECT -eq 1 ]; then
        link_liveblocks_deps
    else
        link_liveblocks_and_peer_deps
    fi

    if [ -d "lib" ]; then
        # SRC_TIMESTAMP="$(oldest_file src node_modules)"
        SRC_TIMESTAMP="$(oldest_file src)"
        LIB_TIMESTAMP="$(youngest_file lib)"
        if [ $SRC_TIMESTAMP -lt $LIB_TIMESTAMP ]; then
            # Lib build is up-to-date
            return
        fi
    fi

    # Build is potentially outdated, rebuild it
    echo "==> Rebuilding (in $(pwd))"
    rm -rf lib
    npm run build
}

rebuild_if_needed
