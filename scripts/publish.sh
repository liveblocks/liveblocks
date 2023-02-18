#!/bin/sh
set -eu

GITHUB_URL="https://github.com/liveblocks/liveblocks"
PACKAGE_DIRS=(
    "packages/liveblocks-core"
    "packages/liveblocks-client"
    "packages/liveblocks-node"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
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
    npm publish --tag private
}

# Publish to NPM
for pkgdir in ${PACKAGE_DIRS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    echo "==> Publishing ${pkgname} to NPM"
    ( cd "$pkgdir" && publish_to_npm "$pkgname" )
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
            echo "==> $pkgname"
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
    collect_otp_token
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
BRANCH="$(git current-branch)"
URL="${GITHUB_URL}/releases/new?tag=v${VERSION}&target=${BRANCH}&title=${VERSION}&body=%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%0A%0APlease%20replace%20this%20block%20with%20the%20contents%20of%20the%20top%20section%20of%3A%0A%0Ahttps%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks%2Fraw%2F${BRANCH}%2FCHANGELOG.md%0A%0A%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20"

