#!/bin/sh
set -eu

err () {
    echo "$@" >&2
}

starts_with () {
    test "${1#$2}" != "$1"
}

usage () {
    err "usage: link-liveblocks.sh [-h] <liveblocks-root> [<project-root>]"
    err
    err ""
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

if [ $# -eq 2 ]; then
    LIVEBLOCKS_ROOT="$(realpath "$1")"
    PROJECT_ROOT="$(realpath "$2")"
elif [ $# -eq 1 ]; then
    # If this script is invoked without the second argument, re-invoke itself with
    # the current directory as an explicit argument.
    exec "$0" "$1" "$(pwd)"
    exit $?
else
    usage
    exit 2
fi

if [ ! -d "$LIVEBLOCKS_ROOT/packages/liveblocks-client" ]; then
    err "$LIVEBLOCKS_ROOT: not a valid checkout of the liveblocks repo."
    err "Please provide the local path to the checked out liveblocks repo."
    exit 2
fi

# Depending on whether this script is run for a project or for another library,
# we'll need to perform linking differently
if starts_with "$PROJECT_ROOT" "$LIVEBLOCKS_ROOT/packages"; then
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

list_peer_dependencies () {
    jq -r '(.peerDependencies // {}) | keys[]' package.json
}

# Checks if the current project depends on the given package name,
# e.g. depends_on @liveblocks/client
depends_on () {
    for item in $(list_dependencies); do
        if [ "$item" = "$1" ]; then
            # Found!
            return 0
        fi
    done
    return 1
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

rebuild_if_needed () {
    pkgname="$1"

    # Update dependencies
    npm_install

    # Link necessary peer dependencies
    link_peer_deps

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
    echo "==> Rebuilding $pkgname"
    rm -rf lib
    npm run build
}

# Links a Liveblocks peer dependency (must link locally)
link_liveblocks_dep () {
    target="$1"  # e.g. client, react, redux, zustand, etc.
}

is_liveblocks_peer () {
    starts_with "$1" "@liveblocks/"
}

# Given a pkg name like "@liveblocks/client", returns "$LIVEBLOCKS_ROOT/packages/liveblocks-client"
liveblocks_pkg_dir () {
    echo "$LIVEBLOCKS_ROOT/packages/liveblocks-${1#@liveblocks/}"
}

# Links another/normal peer dependency (must link to project's node_modules
# directly)
link_peer_deps () {
    if [ "$(list_peer_dependencies | wc -l)" -eq 0 ]; then
        # No peer dependencies, we can quit early
        return
    fi

    link_args=""
    for peerdep in $(list_peer_dependencies); do
        # Only re-link things if there is no such link already
        if [ -L "node_modules/$peerdep" ]; then
            continue
        fi

        if is_liveblocks_peer "$peerdep"; then
            echo "==> Registering $peerdep"
            ( cd "$(liveblocks_pkg_dir "$peerdep")" && npm_link )

            echo "==> Linking peer dependencies in $(basename $(pwd)) <- $peerdep"
            npm_link "$peerdep"
        else
            echo "==> Linking peer dependencies in $(basename $(pwd)) <- $peerdep"
            npm_link "${PROJECT_NODE_MODULES_ROOT}/${peerdep} "
        fi
    done

    echo "==> Linking peer dependencies"
    echo npm link $link_args
    npm_link $link_args
}

# First, rebuild all necessary Liveblocks dependencies
if depends_on "@liveblocks/client"; then
    ( cd "$LIVEBLOCKS_ROOT/packages/liveblocks-client" && rebuild_if_needed "@liveblocks/client" )
fi

if depends_on "@liveblocks/react"; then
    ( cd "$LIVEBLOCKS_ROOT/packages/liveblocks-react" && rebuild_if_needed "@liveblocks/react" )
fi

if depends_on "@liveblocks/redux"; then
    ( cd "$LIVEBLOCKS_ROOT/packages/liveblocks-redux" && rebuild_if_needed "@liveblocks/redux" )
fi

if depends_on "@liveblocks/zustand"; then
    ( cd "$LIVEBLOCKS_ROOT/packages/liveblocks-zustand" && rebuild_if_needed "@liveblocks/zustand" )
fi
