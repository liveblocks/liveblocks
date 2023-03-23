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

GITHUB_URL="https://github.com/liveblocks/liveblocks-schema"
PACKAGE_DIRS=(
    "packages/liveblocks-schema"
    "packages/infer-schema"
    "packages/codemirror-language"
)
PRIMARY_PKG=${PACKAGE_DIRS[0]}

err () {
    echo "$@" >&2
}

is_valid_version () {
    echo "$1" | grep -qEe "^[0-9]+[.][0-9]+[.][0-9]+(-[[:alnum:].]+)?$"
}

usage () {
    err "usage: publish.sh [-V <version>] [-t <tag>] [-h]"
    err
    err ""
    err "Publish a new version of the Liveblocks schema packages to NPM."
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

# Turns "packages/liveblocks-schema" => "@liveblocks/schema"
npm_pkgname () {
    jq -r .name "$1/package.json"
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
        rm -rf "$pkgdir/node_modules"
    done

    echo "Rebuilding node_modules for all workspaces (this may take a while)..."
    rm -rf node_modules
    npm install

    if git is-dirty; then
        err "I just removed node_modules and reinstalled all package dependencies"
        err "inside $pkgdir, and found unexpected changes in the following files:"
        err ""
        ( cd "$ROOT" && git modified )
        err ""
        err "Please fix those issues first."
        exit 2
    fi
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

all_published_pkgnames () {
    for pkgdir in ${PACKAGE_DIRS[@]}; do
        jq -r .name "$ROOT/$pkgdir/package.json"
    done
}

bump_version_in_pkg () {
    VERSION="$1"

    # Only bump if this is a workspace that _has_ a version
    if [ "$(jq -r .version package.json)" != "null" ]; then
        jq ".version = \"$VERSION\"" package.json | sponge package.json
    fi

    for pkgname in $( all_published_pkgnames ); do
        for key in dependencies devDependencies peerDependencies; do
            currversion="$(jq -r ".${key}.\"${pkgname}\"" package.json)"
            if [ "$currversion" != "null" -a "$currversion" != '*' ]; then
                jq ".${key}.\"${pkgname}\" = \"$VERSION\"" package.json | sponge package.json
            fi
        done
    done

    prettier --write package.json
}

# NOTE: Isn't there just a simple NPM command that will list these?
expand_workspace_globs () {
    jq -r '.workspaces[]' "$ROOT/package.json" | sed -Ee 's/.*/echo &/' | sh | tr ' ' '\n'
}

all_workspaces () {
    for possible_workspace in $( expand_workspace_globs ); do
        if [ -f "$possible_workspace/package.json" ]; then
            if [ "$(jq -r .private "$possible_workspace/package.json")" != "true" ]; then
                echo "$possible_workspace"
            fi
        fi
    done
}

build_version_everywhere () {
    VERSION="$1"

    echo "==> Bumping all workspaces to ${VERSION}"
    for pkgdir in $( all_workspaces ); do
        ( cd "$pkgdir" && bump_version_in_pkg "$VERSION" )
    done
}

npm_pkg_exists () {
    PKGNAME="$1"
    test "$(npm view "$PKGNAME@$VERSION" version 2>/dev/null)" = "$VERSION"
}

# This global variable will store the pasted OTP token
OTP=""
OTP_TMPFILE="$(mktemp)"

is_valid_otp_token () {
    echo "$OTP" | grep -qEe "^[0-9]{6}$"
}

#
# Does all the interactive prompting to get a legal OTP token, and writes it
# into the OTP variable, so you can reuse it for multiple commands in a row.
#
collect_otp_token () {
    OTP="$(cat "$OTP_TMPFILE")"
    while ! is_valid_otp_token; do
        if [ -n "$OTP" ]; then
            err "Invalid OTP token: $OTP"
            err "Please try again."
            err ""
        else
            err "To enable writes to the NPM registry, you'll need a One-Time Password (OTP) token."
        fi
        read -p "OTP token? " OTP
        echo "$OTP" > "$OTP_TMPFILE"
    done
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
    collect_otp_token
    npm publish --access public --tag private --otp "$OTP"
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

# Build and publish all the other packages, one-by-one
build_version_everywhere "$VERSION"

# Update package-lock.json with newly bumped versions
npm install
commit_to_git "Bump to $VERSION" "package-lock.json" "packages/"

echo "==> Rebuilding packages"
turbo run build --force

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
            collect_otp_token
            npm dist-tag add "$pkgname@$VERSION" "${TAG:-latest}" --otp "$OTP"
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
    npm dist-tag rm "$pkgname@$VERSION" private --otp "$OTP"
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
URL="${GITHUB_URL}/releases/new?tag=v${VERSION}&target=${BRANCH}&title=${VERSION}&body=%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%0A%0APlease%20replace%20this%20block%20with%20the%20contents%20of%20the%20top%20section%20of%3A%0A%0Ahttps%3A%2F%2Fgithub.com%2Fliveblocks%2Fliveblocks-schema%2Fraw%2Fmain%2FCHANGELOG.md%0A%0A%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20%E2%9C%82%20"
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
fi
