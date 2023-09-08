#!/bin/sh
set -eu

fulldir="$(pwd)"
rootdir="$(git root)"
reldir="${fulldir#"$rootdir"/}"

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

# Step 5: Capture these changes in a Git commit, so you can easily undo this
# later when you're done testing, by simply removing this commit from the
# history.
( cd ../../ && npm i && git add --all && git commit -m "DO NOT KEEP THIS COMMIT - Link $reldir locally" )
