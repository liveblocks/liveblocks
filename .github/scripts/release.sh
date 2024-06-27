#!/bin/bash
set -eu

echo "Running release scripts..."

err () {
    echo "$@" >&2
}

usage () {
    err "usage: release.sh [-h] [-V <version>] <pkgdir> [<pkgdir>...]"
    err
    err "Prepare a release by updating files in this repo."
    err "Run this prior to publishing to NPM."
    err ""
    err "    -V   the new NPM version"
    err ""
}

VERSION=
while getopts V:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        *) usage; exit 2;;
    esac
done
shift "$(($OPTIND - 1))"

if [ "$#" -eq 0 ]; then
    usage
    exit 2
fi

PKGS_TO_RELEASE=("$@")

check_is_valid_version () {
    if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+)?$ ]]; then
        err "Invalid version: $VERSION"
        err "Version must be in the form of X.Y.Z or X.Y.Z-<tag>"
        exit 2
    fi
}

ROOT="$(git rev-parse --show-toplevel)"

all_published_pkgnames () {
    for pkgdir in "${PKGS_TO_RELEASE[@]}"; do
        jq -r .name "$ROOT/$pkgdir/package.json"
    done
}

get_package_name_from_dir () {
    ( cd "$1" && jq -r .name package.json )
}

update_dependencies_to_new_package_versions () {
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
    PKGDIR="$1"
    VERSION="$2"

    PKGNAME="$( get_package_name_from_dir "$PKGDIR" )"

    echo "==> Updating package.json version for $PKGNAME"
    ( cd "$PKGDIR" && npm version "$VERSION" --no-git-tag-version && update_dependencies_to_new_package_versions "$2" )
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

for PKGDIR in "${PKGS_TO_RELEASE[@]}"; do
    update_package_version "$PKGDIR" "$VERSION"
done

# Update package-lock.json with newly bumped versions
npm install
commit_to_git "Bump to $VERSION" "package-lock.json" "packages/" "tools/"
