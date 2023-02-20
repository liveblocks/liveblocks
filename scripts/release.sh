#!/bin/sh
set -eu

PACKAGE_DIRS=(
    "packages/liveblocks-core"
    "packages/liveblocks-client"
    "packages/liveblocks-node"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
)

err () {
    echo "$@" >&2
}


usage () {
    err "usage: release.sh [-V <version>] [-t <tag>] [-h]"
    err
    err ""
    err "Create a release for the CI to publish."
    err
    err "Options:"
    err "-V <version>  Set version to publish (default: prompt)"
    err "-t <tag>      Sets the tag to use on NPM (default: latest)"
    err "-h            Show this help"
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

# transforms packages/liveblocks-core to @liveblocks/core
get_package_name () {
    PKGDIR="$1"
    PKGNAME="$(basename "$PKGDIR")"
    PKGNAME="${PKGNAME#liveblocks-}"
    PKGNAME="@liveblocks/$PKGNAME"
    echo "$PKGNAME"
}

update_package_version () {
    echo "==> Updating package.json at path $1"

    PACKAGE_DIR="$1"
    PKGNAME="$(get_package_name "$PACKAGE_DIR")"

    echo "==> Updating package.json version for $PKGNAME"
    ( cd "$PKGDIR" && npm version "$2" --no-git-tag-version )
}



for PKGDIR in "${PACKAGE_DIRS[@]}"; do
    VERSION_AND_TAG="$VERSION"
    if [ -n "$TAG" ]; then
        VERSION_AND_TAG="$VERSION_AND_TAG-$TAG"
    fi
    update_package_version "$PKGDIR" "$VERSION_AND_TAG"
done

