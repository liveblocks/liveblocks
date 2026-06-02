#!/bin/bash
set -eu

echo "Running release scripts..."

err () {
    echo "$@" >&2
}

usage () {
    err "usage: release.sh [-h] [-V <version>] [-p] [-m <message>] [-f] [-w] <pkgdir> [<pkgdir>...]"
    err
    err "Prepare a release by updating files in this repo."
    err "Run this prior to publishing to NPM (or elsewhere, e.g. DevTools)."
    err ""
    err "    -V   the new NPM version"
    err "    -p   push the bump commit (no need if publish.sh is called afterwards)"
    err "    -m   improve the commit message by specifying what was bumped"
    err "    -f   force version update (use --force flag with npm version)"
    err "    -w   disable workspace updates (use --workspaces-update false with npm version)"
    err ""
}

VERSION=
PUSH_COMMIT="false"
COMMIT_MESSAGE="Bump to "
FORCE_FLAG=""
WORKSPACES_UPDATE_FLAG=""
while getopts V:p:m:fwh flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        p) PUSH_COMMIT="true";;
        m) COMMIT_MESSAGE=$OPTARG;;
        f) FORCE_FLAG="--force";;
        w) WORKSPACES_UPDATE_FLAG="--workspaces-update false";;
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

get_package_name_from_dir () {
    ( cd "$1" && jq -r .name package.json )
}

update_package_version () {
    PKGDIR="$1"
    VERSION="$2"

    PKGNAME="$( get_package_name_from_dir "$PKGDIR" )"

    echo "==> Updating package.json version for $PKGNAME"
    ( cd "$PKGDIR" && npm version "$VERSION" $FORCE_FLAG --no-git-tag-version $WORKSPACES_UPDATE_FLAG )
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
        if [ "$PUSH_COMMIT" = "true" ]; then
            echo "==> Pushing changes to GitHub"
            if ! git push-current; then
                echo "ERROR: Could not push this branch to GitHub!" >&2
                echo "Please manually fix that now." >&2
                exit 2
            else
                echo "Done!"
            fi
        fi
    ) )
}

# A "final" release is X.Y.Z with no -prerelease suffix. Pre-releases like
# 3.19.4-rc2 are intentionally excluded from CHANGELOG heading insertion.
is_final_release () {
    [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

# True if the given CHANGELOG already has a "## vX.Y.Z" heading for this version.
changelog_has_heading () {
    grep -qE "^## v${VERSION//./\\.}( .*)?\$" "$1"
}

# True if a fresh "## vX.Y.Z" heading is due to be inserted into this CHANGELOG.
changelog_needs_heading () {
    is_final_release && [ -f "$1" ] && ! changelog_has_heading "$1"
}

# Classify the "## vNEXT" section of a CHANGELOG: prints "nonempty", "empty"
# (immediately followed by another "## " heading or only blank lines), or
# "missing" (no vNEXT section at all).
vnext_state () {
    awk '
        /^## vNEXT( .*)?$/ { seen = 1; next }
        seen && /^## /          { print "empty"; found = 1; exit }
        seen && /[^[:space:]]/  { print "nonempty"; found = 1; exit }
        END { if (!found) print (seen ? "empty" : "missing") }
    ' "$1"
}

# Fail fast (before any version bump) if a heading is due for this release but
# there are no entries to release under "## vNEXT". A skipped heading
# (pre-release, or already present) needs no entries and is left alone.
assert_changelog_ready () {
    CHANGELOG="$1"
    changelog_needs_heading "$CHANGELOG" || return 0
    case "$( vnext_state "$CHANGELOG" )" in
        nonempty) ;;
        empty)
            err "ERROR: No changelog entries under '## vNEXT' in $CHANGELOG."
            err "Add release notes there before releasing v$VERSION."
            exit 2 ;;
        missing)
            err "ERROR: No '## vNEXT' section found in $CHANGELOG."
            err "Cannot insert a heading for v$VERSION."
            exit 2 ;;
    esac
}

# Insert a "## vX.Y.Z" heading right below the "vNEXT" section, claiming all
# accumulated entries for this release. No-op for pre-releases and for versions
# that already have a heading.
inject_changelog_heading () {
    CHANGELOG="$1"

    if ! is_final_release; then
        echo "==> Skipping CHANGELOG heading for pre-release $VERSION"
        return
    fi
    if changelog_has_heading "$CHANGELOG"; then
        echo "==> CHANGELOG already has a heading for v$VERSION, leaving as-is"
        return
    fi

    echo "==> Adding CHANGELOG heading for v$VERSION"
    tmp="$(mktemp)"
    if awk -v ver="$VERSION" '
        !done && /^## vNEXT( .*)?$/ {
            print
            print ""
            print "## v" ver
            done = 1
            next
        }
        { print }
        END { exit (done ? 0 : 3) }
    ' "$CHANGELOG" > "$tmp"; then
        mv "$tmp" "$CHANGELOG"
    else
        rm -f "$tmp"
        err "WARNING: Could not find a '## vNEXT' section in"
        err "$CHANGELOG; skipping CHANGELOG heading insertion."
    fi
}

check_is_valid_version "$VERSION"

# Fail fast if a heading is due for this release but vNEXT has no entries
assert_changelog_ready "$ROOT/CHANGELOG.md"

# Run a fresh install to ensure the lock file isn't outdated before continuing
pnpm install --no-frozen-lockfile
git is-clean -v

for PKGDIR in "${PKGS_TO_RELEASE[@]}"; do
    update_package_version "$PKGDIR" "$VERSION"
done

# Update pnpm-lock.yaml with newly bumped versions
pnpm install --no-frozen-lockfile

# Add a CHANGELOG heading for this release if one doesn't exist yet
inject_changelog_heading "$ROOT/CHANGELOG.md"

commit_to_git "${COMMIT_MESSAGE}${VERSION}" "pnpm-lock.yaml" "packages/" "tools/" "CHANGELOG.md"
