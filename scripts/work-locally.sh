#!/bin/sh
set -eu

fulldir="$(pwd)"
rootdir="$(git root)"
reldir="${fulldir#"$rootdir"/}"

if [[ "$reldir" != "examples/"* || ! -f ../../package.json ]]; then
    echo "Must run this script in one of our example directories" >&2
    exit 2
fi

git is-clean -v

rm -rf ./node_modules
rm -f ./package-lock.json

for dep in $(jq -r '.dependencies | keys[]' package.json | grep -Ee '@liveblocks/'); do
    jq ".dependencies.\"$dep\" = \"*\"" package.json | sponge package.json
done

if ! grep -q "$reldir" ../../package.json; then
    jq ".workspaces |= . + [\"$reldir\"]" ../../package.json | sponge ../../package.json
fi

( cd ../../ && npm i && git add --all && git commit -m "DO NOT KEEP THIS COMMIT - Link $reldir locally" )
