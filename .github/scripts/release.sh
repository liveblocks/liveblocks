#!/bin/bash
set -eu

echo "Running release scripts..."
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
    err "usage: release.sh [-V <version>] [-h]"
    err
    err ""
    err "Create a release for the CI to publish."
    err
    err "Options:"
    err "-V <version>  Set version to publish (default: prompt)"
    err "Example: 1.0.0 or 1.0.1-beta1"
}

VERSION=
while getopts V:t:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        *) usage; exit 2;;
    esac
done
shift "$(($OPTIND - 1))"

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

ROOT="$(git rev-parse --show-toplevel)"

all_published_pkgnames () {
    for pkgdir in ${PACKAGE_DIRS[@]}; do
        jq -r .name "$ROOT/$pkgdir/package.json"
    done
}

get_package_name_from_dir(){
    ( cd "$1" && jq -r .name package.json )
}

update_dependencies_to_new_package_versions(){
    for pkgname in $( all_published_pkgnames ); do
      for key in dependencies devDependencies peerDependencies; do
          currversion="$(jq -r ".${key}.\"${pkgname}\"" package.json)"
          if [ "$currversion" != "null" -a "$currversion" != '*' ]; then
              jq ".${key}.\"${pkgname}\" = \"$1\"" package.json | sponge package.json
          fi
      done
    done
}

update_package_version () {
    PACKAGE_DIR="$1"
    PKGNAME="$(get_package_name_from_dir "$PACKAGE_DIR")"

    echo "==> Updating package.json version for $PKGNAME"
    ( cd "$PKGDIR" && npm version "$2" --no-git-tag-version && update_dependencies_to_new_package_versions "$2" )
}

commit_to_git () {
    msg="$1"
    shift 1
    ( cd "$ROOT" && (
        git reset --quiet HEAD
        git add "$@"
        if git is-dirty -i; then
            git commit -m "$msg"
        fi
    ) )
}

check_is_valid_version "$VERSION"

# Set up turbo
npm install

for PKGDIR in "${PACKAGE_DIRS[@]}"; do
    update_package_version "$PKGDIR" "$VERSION"
done

# Update package-lock.json with newly bumped versions
npm install
commit_to_git "Bump to $VERSION" "package-lock.json" "packages/"
