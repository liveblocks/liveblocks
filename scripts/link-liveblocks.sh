#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"

if [ ! -f "package.json" ]; then
    echo "Please run this script from inside a library or project directory." >&2
    exit 2
fi

# Global that points to the node_modules folder of the current package, to
# backlink peer dependencies into
PKG_ROOT="$(pwd)/node_modules"

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
    test "${1#@liveblocks/}" != "$1"
}

# Given a pkg name like "@liveblocks/client", returns "$ROOT/packages/liveblocks-client"
liveblocks_pkg_dir () {
    echo "$ROOT/packages/liveblocks-${1#@liveblocks/}"
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
            npm_link "${PKG_ROOT}/${peerdep} "
        fi
    done

    echo "==> Linking peer dependencies"
    echo npm link $link_args
    npm_link $link_args
}

# First, rebuild all necessary Liveblocks dependencies
if depends_on "@liveblocks/client"; then
    ( cd "$ROOT/packages/liveblocks-client" && rebuild_if_needed "@liveblocks/client" )
fi

if depends_on "@liveblocks/react"; then
    ( cd "$ROOT/packages/liveblocks-react" && rebuild_if_needed "@liveblocks/react" )
fi

if depends_on "@liveblocks/redux"; then
    ( cd "$ROOT/packages/liveblocks-redux" && rebuild_if_needed "@liveblocks/redux" )
fi

if depends_on "@liveblocks/zustand"; then
    ( cd "$ROOT/packages/liveblocks-zustand" && rebuild_if_needed "@liveblocks/zustand" )
fi
