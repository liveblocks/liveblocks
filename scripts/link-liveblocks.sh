#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"

if [ "$(dirname "$(pwd)")" != "$ROOT/packages" -o "$(pwd)" = "$ROOT/packages/liveblocks-client" ]; then
    echo "Please run this script from inside one of the packages that depend on @liveblocks/client." >&2
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

rebuild_if_outdated () {
    # Update dependencies
    npm_install

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
    echo "==> Rebuilding @liveblocks/client"
    rm -rf lib
    npm run build
}

# Always check to see if we should rebuild the client to match the current src
( cd "$ROOT/packages/liveblocks-client" && rebuild_if_outdated )

# Only re-link things if there is no such link already
if [ ! -L "node_modules/@liveblocks/client" ]; then
    echo "==> Registering @liveblocks/client"
    ( cd "$ROOT/packages/liveblocks-client" && npm_link )

    echo "==> Linking @liveblocks/client"
    npm_install
    npm_link @liveblocks/client
fi
