#!/bin/bash
set -eu

GITHUB_URL="https://github.com/liveblocks/liveblocks"
PACKAGE_DIRS=(
    "packages/liveblocks-core"
    "packages/liveblocks-client"
    "packages/liveblocks-node"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
    "packages/create-liveblocks-app"
)
PRIMARY_PKG=${PACKAGE_DIRS[0]}

err () {
    echo "$@" >&2
}

VERSION=
TAG=
while getopts V:t:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        t) TAG=$OPTARG;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

if [ "$#" -ne 0 ]; then
    err "Unknown arguments: $@"
    usage
    exit 2
fi

check_is_valid_version () {
    if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+)?$ ]]; then
        err "Invalid version: $VERSION"
        err "Version must be in the form of X.Y.Z or X.Y.Z-<tag>"
        exit 2
    fi
}

check_is_valid_tag () {
    if ! [[ "$TAG" =~ ^[a-z0-9]+$ ]]; then
        err "Invalid tag: $TAG"
        err "Tag must be in the form of <tag>"
        exit 2
    fi
}

npm_pkg_exists () {
    PKGNAME="$1"
    test "$(npm view "$PKGNAME@$VERSION" version 2>/dev/null)" = "$VERSION"
}

publish_to_npm () {
    PKGNAME="$1"

    if npm_pkg_exists "$PKGNAME"; then
        err ""
        err "===================================================================="
        err "WARNING: Package $PKGNAME @ $VERSION already exists on NPM!"
        err "Will skip this for now and continue with the rest of the script..."
        err "===================================================================="
        err ""
        return
    fi

    if [ -f "./dist/package.json" ]; then
        cd "./dist"
    fi

    echo "I'm ready to publish $PKGNAME to NPM, under $VERSION!"
    # TODO: remove dry-run
    npm publish --tag private
}

# Turns "packages/liveblocks-core" => "@liveblocks/core"
npm_pkgname () {
    jq -r .name "$1/package.json"
}

check_is_valid_version "$VERSION"
check_is_valid_tag "$TAG"

# Publish to NPM
for pkgdir in ${PACKAGE_DIRS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    echo "==> Publishing ${pkgname} to NPM"
    ( cd "$pkgdir" && publish_to_npm "$pkgname")
done

# By now, all packages should be published under a "private" tag.
# We'll verify that now, and if indeed correct, we'll "assign" the intended tag
# instead. Afterwards, we'll remove the "private" tags again.
echo ""
echo "Assigning definitive NPM tags"
for pkgdir in ${PACKAGE_DIRS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    while true; do
        if npm dist-tag ls "$pkgname" | grep -qx "private: $VERSION"; then
            echo "==> Adding tag ${TAG:-latest} to $pkgname @ $VERSION"
            npm dist-tag add "$pkgname@$VERSION" "${TAG:-latest}"
            break
        else
            err "I can't find $pkgname @ $VERSION on NPM under the 'private' tag yet..."
            read
        fi
    done
done

# Clean up those temporary "private" tags
for pkgdir in ${PACKAGE_DIRS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    npm dist-tag rm "$pkgname@$VERSION" private
done

echo ""
echo "All published!"
echo ""
echo "You can double-check the NPM releases here:"
for pkgdir in ${PACKAGE_DIRS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    echo "  - https://www.npmjs.com/package/$pkgname"
done
echo ""

echo "==> Pushing changes to GitHub"
if ! git push-current; then
    err "WARNING: Could not push this branch to GitHub!"
    err "Please manually fix that now, before writing the release notes!"
    exit 2
else
    echo "Done! Please finish it off by writing a nice changelog entry on GitHub."
fi
