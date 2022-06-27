#!/bin/sh
set -eu

# Ensure this script can assume it's run from the repo's
# root directory, even if the current working directory is
# different.
ROOT="$(git rev-parse --show-toplevel)"
if [ "$(pwd)" != "$ROOT" ]; then
    ( cd "$ROOT" && exec "$0" "$@" )
    exit $?
fi

GITHUB_URL="https://github.com/liveblocks/liveblocks"
PACKAGE_DIRS=(
    "packages/liveblocks-client"
    "packages/liveblocks-node"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
)
PRIMARY_PKG=${PACKAGE_DIRS[0]}
SECONDARY_PKGS=${PACKAGE_DIRS[@]:1}

err () {
    echo "$@" >&2
}

is_valid_version () {
    echo "$1" | grep -qEe "^[0-9]+[.][0-9]+[.][0-9]+(-[[:alnum:].]+)?$"
}

is_valid_otp_token () {
    echo "$1" | grep -qEe "^[0-9]{6}$"
}

usage () {
    err "usage: publish.sh [-V <version>] [-t <tag>] [-h]"
    err
    err ""
    err "Publish a new version of the Liveblocks packages to NPM."
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

# Turns "packages/liveblocks-client" => "@liveblocks/client"
npm_pkgname () {
    PKGDIR="$1"
    echo "@liveblocks/${PKGDIR#"packages/liveblocks-"}"
}

check_git_toolbelt_installed () {
    # Test existence of a random toolbelt command
    if ! which -s git-root; then
        err ""
        err "Oops!"
        err "git-toolbelt is not installed. The git-toolbelt is"
        err "a collection of useful small scripts that make writing"
        err "shell scripts easier. This script relies on it!"
        err ""
        err "You can find it at:"
        err "  https://github.com/nvie/git-toolbelt"
        err ""
        err "Please run:"
        err "  brew install fzf"
        err "  brew tap nvie/tap"
        err "  brew install nvie/tap/git-toolbelt"
        err ""
        exit 2
    fi
}

check_moreutils_installed () {
    if ! which -s sponge; then
        err ""
        err "Moreutils is not installed. It's a fantastic toolkit of UNIX"
        err "tools that make writing scripts like this much easier."
        err ""
        err "You can find more info at:"
        err "  https://joeyh.name/code/moreutils"
        err ""
        err "Please run:"
        err "  brew install moreutils"
        err ""
        exit 2
    fi
}

check_jq_installed () {
    if ! which -s jq; then
        err ""
        err "jq is not installed."
        err ""
        err "You can find it at:"
        err "  https://stedolan.github.io/jq/"
        err ""
        err "Please run:"
        err "  brew install jq"
        err ""
        exit 2
    fi
}

check_current_branch () {
    # Check we're on the main branch
    if [ -z "$TAG" -a "$(git current-branch)" != "main" ]; then
        err "To publish a package without a tag, you must be on \"main\" branch."
        exit 2
    fi
}

check_up_to_date_with_upstream () {
    # Update to latest version
    git fetch

    if [ "$(git sha)" != "$(git sha $(git current-branch))" ]; then
        err "Not up to date with upstream. Please pull/push latest changes before publishing."
        exit 2
    fi
}

check_no_local_changes () {
    if git is-dirty; then
        err "There are local changes. Please commit those before publishing."
        exit 3
    fi
}

check_npm_stuff_is_stable () {
    for pkgdir in ${PACKAGE_DIRS[@]}; do
        pkgname="$(npm_pkgname "$pkgdir")"
        echo "Rebuilding node_modules for $pkgname (this may take a while)..."
        ( cd "$pkgdir" && (
            # Before bumping anything, first make sure that all projects have
            # a clean and stable node_modules directory and lock files!
            rm -rf node_modules

            logfile="$(mktemp)"
            if ! npm install > "$logfile" 2> "$logfile"; then
                cat "$logfile" >&2
                err ""
                err "The error above happened during the building of $PKGDIR."
                exit 4
            fi

            if git is-dirty; then
                err "I just removed node_modules and reinstalled all package dependencies"
                err "inside $pkgdir, and found unexpected changes in the following files:"
                err ""
                ( cd "$ROOT" && git modified )
                err ""
                err "Please fix those issues first."
                exit 2
            fi
        ) )
    done
}

check_all_the_things () {
    if [ -n "$VERSION" ] && ! is_valid_version "$VERSION"; then
        # Check for typos early on
        err "Invalid version: $VERSION"
        exit 2
    fi

    check_git_toolbelt_installed
    check_jq_installed
    check_moreutils_installed
    check_current_branch
    check_up_to_date_with_upstream
    check_no_local_changes
    check_npm_stuff_is_stable
}

check_all_the_things

CURRENT_VERSION="$(jq -r .version "$PRIMARY_PKG/package.json")"
if [ -z "$VERSION" ]; then
    echo "The current version is: $CURRENT_VERSION"
fi

while ! is_valid_version "$VERSION"; do
    if [ -n "$VERSION" ]; then
        err "Invalid version number: $VERSION"
        err "Please try again."
        err ""
    fi
    read -p "Enter a new version: " VERSION
done

bump_version_in_pkg () {
    PKGDIR="$1"
    VERSION="$2"

    jq ".version=\"$VERSION\"" package.json | sponge package.json

    # If this is one of the client packages, also bump the peer dependency
    if [ "$(jq '.peerDependencies."@liveblocks/client"' package.json)" != "null" ]; then
        jq ".peerDependencies.\"@liveblocks/client\"=\"$VERSION\"" package.json | sponge package.json
    fi

    prettier --write package.json

    logfile="$(mktemp)"
    if ! npm install > "$logfile" 2> "$logfile"; then
        cat "$logfile" >&2
        err ""
        err "The error above happened during the building of $PKGDIR."
        exit 4
    fi

    if [ "$CURRENT_VERSION" != "$VERSION" ]; then
        if ! git modified | grep -qEe package-lock.json; then
            err "Hmm. package-lock.json wasn\'t affected by the version bump. This is fishy. Please manually inspect!"
            exit 5
        fi
    fi
}

build_pkg () {
    npm run build
}

npm_pkg_exists () {
    PKGNAME="$1"
    test "$(npm view "$PKGNAME@$VERSION" version)" = "$VERSION"
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

    echo "I'm ready to publish $PKGNAME to NPM, under $VERSION!"
    echo "For this, I'll need the One-Time Password (OTP) token."

    OTP=""
    while ! is_valid_otp_token "$OTP"; do
        if [ -n "$OTP" ]; then
            err "Invalid OTP token: $OTP"
            err "Please try again."
            err ""
        fi
        read -p "OTP token? " OTP
    done

    if [ -f "./lib/package.json" ]; then
        cd "./lib"
    fi

    npm publish --tag "${TAG:-latest}" --otp "$OTP"
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

# First build and publish the primary package
( cd "$PRIMARY_PKG" && (
    pkgname="$(npm_pkgname "$PRIMARY_PKG")"
    echo "==> Building and publishing $PRIMARY_PKG"
    bump_version_in_pkg "$PRIMARY_PKG" "$VERSION"
    build_pkg
    publish_to_npm "$pkgname"
    commit_to_git "Bump to $VERSION" "$PRIMARY_PKG"
) )

# Then, build and publish all the other packages
for pkgdir in ${SECONDARY_PKGS[@]}; do
    pkgname="$(npm_pkgname "$pkgdir")"
    echo "==> Building and publishing ${pkgname}"
    ( cd "$pkgdir" && (
        bump_version_in_pkg "$pkgdir" "$VERSION"
        build_pkg
        publish_to_npm "$pkgname"
    ) )
done
commit_to_git "Bump to $VERSION" ${SECONDARY_PKGS[@]}

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
if ! git push-current; then
    err "WARNING: Could not push this branch to GitHub!"
    err "Please manually fix that now, before writing the release notes!"
    err
    err "When you're done, open this link to write the release notes:"
    err "$URL"
    err
else
    echo "Done! Please finish it off by writing a nice changelog entry on GitHub."
    open "$URL"
    read
fi

echo "==> Upgrade local examples?"
echo "Now that you're all finished, you may want to also upgrade all our examples"
echo "to the latest version. To do so, run:"
echo
echo "    upgrade-examples.sh $VERSION"
echo
