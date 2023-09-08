#!/bin/sh
set -eu

fulldir="$(pwd)"
rootdir="$(git root)"
reldir="${fulldir#"$rootdir"/}"

err () {
    echo "$@" >&2
}

usage () {
    err "usage: link-example-locally.sh [-ch]"
    err
    err "Run this script from within an example directory. It will turn that example"
    err "from an standalone NPM project into a workspace, so that it will use the"
    err "local @liveblocks/* packages instead of the last published version on NPM."
    err
    err "Options:"
    err "-c    Create Git commit with these changes (intended to be removed later)"
    err "-h    Show this help"
}

commit=0
while getopts ch flag; do
    case "$flag" in
        c) commit=1 ;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

if [[ "$reldir" != "examples/"* || ! -f ../../package.json ]]; then
    echo "Must run this script in one of our example directories" >&2
    exit 2
fi

# Step 1: First make sure there are no local changes in the worktree
git is-clean -v

# Step 2: Wipe local example's node_modules and package-lock. We're going to
# make it a workspace project after all, and those don't have them
rm -rf ./node_modules
rm -f ./package-lock.json

# Step 3: Replace @liveblocks dependencies in the current example by a "*"
# reference, so they will be picked up from the local workspaces instead.
for dep in $(jq -r '.dependencies | keys[]' package.json | grep -Ee '@liveblocks/'); do
    jq ".dependencies.\"$dep\" = \"*\"" package.json | sponge package.json
done

# Step 4: Add this example to the top-level package.json to officially make it
# a workspace.
if ! grep -q "$reldir" ../../package.json; then
    jq ".workspaces |= . + [\"$reldir\"]" ../../package.json | sponge ../../package.json
fi

( cd ../../ && npm i > /dev/null )

err "All good! Current example is now a local NPM workspace."

# Step 5: Capture these changes in a Git commit, so you can easily undo this
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
