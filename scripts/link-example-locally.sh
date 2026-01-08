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
    err "from an standalone NPM project into a workspace, so that it will use the"
    err "local @liveblocks/* packages instead of the last published version on NPM."
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

if [[ "$reldir" != "examples/"* || ! -f ../../package.json ]]; then
    echo "Must run this script in one of our example directories" >&2
    exit 2
fi

# Step 1: First make sure there are no local changes in the worktree
if [ "$force" -ne 1 ]; then
  git is-clean -v
fi

# Step 2: Wipe local example's node_modules and package-lock. We're going to
# make it a workspace project after all, and those don't have them
rm -rf ./node_modules
rm -f ./package-lock.json

# Step 3: Replace @liveblocks dependencies in the current example by a "*"
# reference, so they will be picked up from the local workspaces instead.
for dep in $(jq -r '.dependencies | keys[]' package.json | grep -Ee '@liveblocks/'); do
    jq ".dependencies.\"$dep\" = \"file:../../packages/liveblocks-${dep#@liveblocks/}\"" package.json | sponge package.json
done

# Step 4: Build all @liveblocks packages to ensure they're up-to-date (optional)
if [ "$build" -eq 1 ]; then
    err "Building @liveblocks packages..."
    if ! ( cd ../../ && npm run build > /dev/null 2>&1 ); then
        err "Warning: Some packages failed to build. This may cause version mismatch issues."
        err "You can manually build packages with: npm run build"
    fi
fi

# Step 5: Add this example to the top-level package.json to officially make it
# a workspace.
if ! grep -q "\"$reldir\"" ../../package.json; then
    jq ".workspaces |= . + [\"$reldir\"]" ../../package.json | sponge ../../package.json
fi

( cd ../../ && npm i > /dev/null )

npm i

# Reset all changes if no-modify mode is enabled
if [ "$no_modify" -eq 1 ]; then
    git reset --hard HEAD
    err "No-modify mode: All changes have been reset after linking."
    err "Local packages are linked for this session but no files were modified permanently."
    exit 0
fi

err "All good! Current example is now a local NPM workspace."

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
