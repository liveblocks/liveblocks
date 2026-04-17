#!/bin/sh
set -eu

fulldir="$(pwd)"
rootdir="$(git root)"
reldir="${fulldir#"$rootdir"/}"

err () {
    echo "$@" >&2
}

usage () {
    err "usage: link-example-locally.sh [-bcfhn]"
    err
    err "Run this script from within an example directory. It will turn that example"
    err "into a pnpm workspace member, so that it will use the local @liveblocks/*"
    err "packages instead of the last published version on NPM."
    err
    err "Options:"
    err "-b    Build all @liveblocks packages before linking (otherwise use Turborepo to run the example)"
    err "-c    Create Git commit with these changes (intended to be removed later)"
    err "-f    Proceed even if there are uncommitted Git changes"
    err "-h    Show this help"
    err "-n    No-modify mode: reset all changes after linking (prevents accidental commits)"
}

build=0
commit=0
force=0
no_modify=0
while getopts bcfhn flag; do
    case "$flag" in
        b) build=1 ;;
        c) commit=1 ;;
        f) force=1 ;;
        n) no_modify=1 ;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

# Don't allow no-modify mode with force mode
if [ "$no_modify" -eq 1 ] && [ "$force" -eq 1 ]; then
    err "Error: Cannot use -n (no-modify) and -f (force) options together."
    err "The -n option does a reset so using it could cause you to lose your work."
    exit 2
fi

if [[ "$reldir" != "examples/"* || ! -f ../../pnpm-workspace.yaml ]]; then
    echo "Must run this script in one of our example directories" >&2
    exit 2
fi

# Step 1: First make sure there are no local changes in the worktree
if [ "$force" -ne 1 ]; then
  git is-clean -v
fi

# Step 2: Wipe local example's node_modules, build caches, and package-lock.
# We're going to make it a workspace project after all, and those don't have
# them. Stale build caches from a previous (non-linked) run also need to go.
rm -rf ./node_modules ./.turbo ./.next
rm -f ./package-lock.json

# Step 3: Replace @liveblocks dependencies with workspace:* protocol so pnpm
# links them as real workspace members (via symlinks to the source), not as
# physical copies. Copies break React context because pnpm's virtual store
# ends up with a different @liveblocks/react than what @liveblocks/react-lexical
# resolves to, producing duplicate React contexts at runtime.
for dep in $(jq -r '.dependencies | keys[]' package.json | grep -Ee '@liveblocks/'); do
    jq ".dependencies.\"$dep\" = \"workspace:*\"" package.json | sponge package.json
done

# Step 4: Build all @liveblocks packages to ensure they're up-to-date (optional)
if [ "$build" -eq 1 ]; then
    err "Building @liveblocks packages..."
    if ! ( cd ../../ && pnpm run build --filter='packages/*' > /dev/null 2>&1 ); then
        err "Warning: Some packages failed to build. This may cause version mismatch issues."
        err "You can manually build packages with: pnpm run build"
    fi
fi

# Step 5: Add this example to pnpm-workspace.yaml to officially make it
# a workspace.
if ! grep -q "\"$reldir\"" ../../pnpm-workspace.yaml; then
    sed -i '' "/^packages:/a\\
\\  - \"$reldir\"
" ../../pnpm-workspace.yaml
fi

# Step 5b: If this is a Next.js example, point turbopack.root at the monorepo
# root so it can resolve pnpm-hoisted dependencies. Next.js requires an
# absolute path here.
if jq -e '.dependencies.next // .devDependencies.next' package.json > /dev/null 2>&1; then
    abs_root="$(cd ../.. && pwd)"
    for cfg in next.config.ts next.config.js next.config.mjs; do
        if [ -f "$cfg" ]; then
            sed -i '' "s|root: __dirname|root: \"$abs_root\"|g" "$cfg"
        fi
    done
fi

( cd ../../ && pnpm install --ignore-scripts --config.confirmModulesPurge=false )

# Step 6: Delete each package's own copy of its peerDependencies. Without
# this, pnpm's strict isolation causes @liveblocks/react (and friends) to
# resolve react from their own devDeps (installed for testing) instead of
# from the example's node_modules, resulting in two React instances and
# "RoomProvider is missing from the React tree" errors at runtime.
for pkg_json in ../../packages/*/package.json; do
    pkg_dir="$(dirname "$pkg_json")"
    peers="$(jq -r '.peerDependencies // {} | keys[]' "$pkg_json")"
    for peer in $peers; do
        rm -rf "$pkg_dir/node_modules/$peer"
    done
done

# Reset all changes if no-modify mode is enabled
if [ "$no_modify" -eq 1 ]; then
    git reset --hard HEAD
    err "No-modify mode: All changes have been reset after linking."
    err "Local packages are linked for this session but no files were modified permanently."
    exit 0
fi

err "All good! Current example is now a local pnpm workspace."

# Step 6: Capture these changes in a Git commit, so you can easily undo this
# later when you're done testing, by simply removing this commit from the
# history.
if [ "$commit" -eq 1 ]; then
    if git is-dirty; then
        git commit -qam "DO NOT KEEP THIS COMMIT - Link $reldir locally"
        err "Changes committed to Git."
        err ""
        err "IMPORTANT! Please make sure to remove this commit from the Git history when you're done."
        err ""
    fi
else
    err ""
    err "IMPORTANT! Please make sure to not commit any of these changes to Git."
fi
