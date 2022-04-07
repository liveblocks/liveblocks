#!/bin/sh
set -eu

# The output directory for the package build
ROOT="$(git rev-parse --show-toplevel)"
GITHUB_URL="https://github.com/liveblocks/liveblocks"
PACKAGE_DIRS=(
    "packages/liveblocks-client"
    "packages/liveblocks-react"
    "packages/liveblocks-redux"
    "packages/liveblocks-zustand"
)

err () {
    echo "$@" >&2
}

usage () {
    err "usage: publish.sh [-V <version> [-t <tag>] [-h]"
    # err "usage: publish.sh [-Vtnh]"
    err
    err ""
    err "Publish a new version of the Liveblocks packages to NPM."
    err
    err "Options:"
    err "-V <version>  Set version to publish (default: prompt)"
    err "-t <tag>      Sets the tag to use on NPM (default: latest)"
    # err "-n            Dry run"
    err "-h            Show this help"
}

VERSION=
TAG=
# dryrun=0
# while getopts V:t:nh flag; do
while getopts V:t:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        t) TAG=$OPTARG;;
        # n) dryrun=1;;
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

if [ "$#" -ne 0 ]; then
    err "Unknown arguments: $@"
    usage
    exit 2
fi

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
    if [ "$(git current-branch)" != "main" ]; then
        err "To publish this package, you must be on \"main\" branch."
        exit 2
    fi
}

check_up_to_date_with_upstream () {
    # Update to latest version
    git fetch

    if [ "$(git sha main)" != "$(git sha origin/main)" ]; then
        err "Not up to date with upstream. Please pull/push latest changes before publishing."
        exit 2
    fi
}

check_cwd () {
    if [ "$(pwd)" != "$ROOT" ]; then
        err "This script must be run from the project's root directory."
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
    for pkg in ${PACKAGE_DIRS[@]}; do
        ( cd "$pkg" && (
            # Before bumping anything, first make sure that all projects have
            # a clean and stable node_modules directory and lock files!
            rm -rf node_modules lib
            npm install

            if git is-dirty; then
                err "I just removed node_modules and reinstalled all package dependencies"
                err "inside $pkg, and found unexpected changes in the following files:"
                err ""
                git modified
                err ""
                err "Please fix those issues first."
                exit 2
            fi
        ) )
    done
}

check_all_the_things () {
    check_git_toolbelt_installed
    check_jq_installed
    check_moreutils_installed
    # check_current_branch   # TODO: Put back, or allow custom branches
    check_up_to_date_with_upstream
    check_cwd
    check_no_local_changes
    check_npm_stuff_is_stable
}

check_all_the_things

echo "The current version is: $(jq -r .version "${PACKAGE_DIRS[0]}/package.json")"

while ! echo "$VERSION" | grep -Ee "^[0-9]+[.][0-9]+[.][0-9]+(-[[:alnum:].]+)?$"; do
    if [ -n "$VERSION" ]; then
        err "Invalid version number: $VERSION"
        err "Please try again."
        err ""
    fi
    read -p "Enter a new version: " VERSION
done

# Write the same new version to all package.json files
for pkg in ${PACKAGE_DIRS[@]}; do
    ( cd "$pkg" && (
        jq ". + { version: \"$VERSION\" }" package.json | sponge package.json
        prettier --write package.json
        npm install

        if ! git modified | grep -qEe package-lock.json; then
            err "Hmm. package-lock.json wasn\'t affected by the version bump. This is fishy. Please manually inspect!"
            exit 5
        fi

        rm -rf node_modules lib
        npm run build
        # TODO: commit changes here?
    ) )
done

echo "Done"
exit 33

DIST="${ROOT}/dist"

# Work from the root folder, build the dist/ folder
cd "$ROOT"

yarn run test
./bin/build.sh

if git is-dirty; then
    git commit -m "Bump package `@liveblocks/client` to $VERSION" package.json
    git push-current
fi

read -p "OTP token? " OTP
if [ -z "$OTP" ]; then
    exit 2
fi

cd "$DIST" && yarn publish --new-version "$VERSION" --otp "$OTP" "$@"

# Open browser tab to create new release
open "${GITHUB_URL}/blob/v${VERSION}/CHANGELOG.md"
open "${GITHUB_URL}/releases/new?tag=${VERSION}&title=${VERSION}&body=%23%23%20%60%40liveblocks%2Fclient%60%0A%0A-%20%2A%2ATODO%3A%20Describe%20relevant%20changes%20for%20this%20package%2A%2A%0A%0A%0A%23%23%20%60%40liveblocks%2Freact%60%0A%0A-%20%2A%2ATODO%3A%20Describe%20relevant%20changes%20for%20this%20package%2A%2A%0A%0A%0A%23%23%20%60%40liveblocks%2Fredux%60%0A%0A-%20%2A%2ATODO%3A%20Describe%20relevant%20changes%20for%20this%20package%2A%2A%0A%0A%0A%23%23%20%60%40liveblocks%2Fzustand%60%0A%0A-%20%2A%2ATODO%3A%20Describe%20relevant%20changes%20for%20this%20package%2A%2A%0A%0A"
