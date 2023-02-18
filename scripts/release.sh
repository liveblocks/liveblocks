GITHUB_URL="https://github.com/liveblocks/liveblocks"
PACKAGE_DIRS=(
    "packages/liveblocks-core"
    "packages/liveblocks-client"
    "packages/liveblocks-node"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
)

VERSION=
TAG=

while getopts V:t:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        t) TAG=$OPTARG;;
        *) usage; exit 2;;
    esac
done

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

update_package_versions () {
    PKGDIR="$1"
    PKGNAME="$(basename "$PKGDIR")"
    PKGNAME="${PKGNAME#liveblocks-}"
    PKGNAME="@liveblocks/$PKGNAME"

    echo "==> Updating package.json version for $PKGNAME"
    ( cd "$PKGDIR" && npm version "$VERSION" --no-git-tag-version )
}

# Do we want to install liveblocks packages used by liveblocks packages to the
# new versions? ex: @liveblocks/react@1.0.0 using @liveblocks/client@1.0.0