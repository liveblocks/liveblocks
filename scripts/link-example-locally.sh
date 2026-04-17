#!/bin/sh
set -eu

fulldir="$(pwd)"
rootdir="$(git root)"
reldir="${fulldir#"$rootdir"/}"

err () {
    echo "$@" >&2
}

usage () {
    err "usage: link-example-locally.sh [-h]"
    err
    err "Run this script from within an example directory. It will turn that example"
    err "into a pnpm workspace member so that it uses the local @liveblocks/* packages"
    err "instead of the last published versions on NPM, and commit all the changes it"
    err "makes into a single, clearly-marked commit that you can drop with git rebase"
    err "when you're done. Pushing is blocked by a pre-push hook (and by CI) as long"
    err "as that commit is in your branch."
    err
    err "Requires a clean working tree — stash any in-progress changes first."
    err
    err "Options:"
    err "-h    Show this help"
}

while getopts h flag; do
    case "$flag" in
        *) usage; exit 2;;
    esac
done
shift $(($OPTIND - 1))

if [[ "$reldir" != "examples/"* || ! -f ../../pnpm-workspace.yaml ]]; then
    echo "Must run this script in one of our example directories" >&2
    exit 2
fi

# Step 1: Require a clean working tree. The script commits everything it
# changes into a single commit; if you have pending work, stash it first so
# it doesn't get swept into the temporary link commit.
if ! git is-clean -v; then
    err ""
    err "Working tree is not clean. Stash your changes first:"
    err ""
    err "    git stash"
    err ""
    err "…then re-run this script. Run 'git stash pop' when you're done."
    exit 1
fi

# Step 2: Wipe local example's node_modules, build caches, and package-lock.
# We're going to make it a workspace project after all, and those don't have
# them. Stale build caches from a previous (non-linked) run also need to go.
rm -rf ./node_modules ./.turbo ./.next
rm -f ./package-lock.json

# Step 3: Replace @liveblocks dependencies with workspace:* protocol so pnpm
# links them as real workspace members (via symlinks to the source), not as
# physical copies. Copies break React context because pnpm's virtual store
# ends up with a different @liveblocks/react than what @liveblocks/react-lexical
# resolves to, producing duplicate React contexts at runtime.
for dep in $(jq -r '.dependencies | keys[]' package.json | grep -Ee '@liveblocks/'); do
    jq ".dependencies.\"$dep\" = \"workspace:*\"" package.json | sponge package.json
done

# Step 4: Build all @liveblocks packages. Examples import from each package's
# "main"/"exports" entry, which points to dist/, so the dist output must exist
# or imports fail at runtime.
err "Building @liveblocks packages..."
if ! ( cd ../../ && pnpm run build --filter='./packages/*' > /dev/null 2>&1 ); then
    err "Warning: Some packages failed to build. This may cause version mismatch issues."
    err "You can manually build packages with: pnpm run build"
fi

# Step 5: Add this example to pnpm-workspace.yaml to officially make it
# a workspace.
if ! grep -q "\"$reldir\"" ../../pnpm-workspace.yaml; then
    sed -i '' "/^packages:/a\\
\\  - \"$reldir\"
" ../../pnpm-workspace.yaml
fi

# Step 5b: If this is a Next.js example, point turbopack.root at the monorepo
# root so it can resolve pnpm-hoisted dependencies. Next.js requires an
# absolute path here.
if jq -e '.dependencies.next // .devDependencies.next' package.json > /dev/null 2>&1; then
    abs_root="$(cd ../.. && pwd)"
    for cfg in next.config.ts next.config.js next.config.mjs; do
        if [ -f "$cfg" ]; then
            sed -i '' "s|root: __dirname|root: \"$abs_root\"|g" "$cfg"
        fi
    done
fi

# Step 5c: Pin every dep the example declares to the exact version the example
# wants, using pnpm.overrides in the root package.json. Without this, our
# packages' devDeps (e.g. react ^18.2.0, @lexical/react 0.35.0 with different
# peer combos) resolve to different virtual pnpm copies than the example,
# producing duplicate React / @lexical/react contexts at runtime.
# The "link-locally-do-not-commit" key is a sentinel. CI scans every PR for it and
# refuses to merge anything that contains it, and the pre-push hook installed
# in step 7 refuses to push commits that contain it. Do NOT remove.
overrides_json="$(jq -c '[{"link-locally-do-not-commit": "0.0.0"}, (.dependencies // {}), (.devDependencies // {})] | add | to_entries | map(select(.key | startswith("@liveblocks/") | not)) | from_entries' package.json)"
jq --argjson overrides "$overrides_json" '.pnpm = (.pnpm // {}) | .pnpm.overrides = $overrides' ../../package.json | sponge ../../package.json

( cd ../../ && pnpm install --ignore-scripts --config.confirmModulesPurge=false )

# Step 7: Install a local pre-push hook that refuses to push any commit
# containing the link-locally-do-not-commit sentinel. This is a local-only safety net;
# CI has a matching check on every PR. The hook is never overwritten if one
# already exists.
hook_path="$(git rev-parse --git-path hooks/pre-push)"
if [ ! -e "$hook_path" ]; then
    cat > "$hook_path" <<'HOOK_EOF'
#!/bin/sh
# Installed by scripts/link-example-locally.sh. Safe to delete at any time.
# Refuses to push any commit containing the link-locally-do-not-commit sentinel left
# behind by the link-example-locally.sh script.
remote="$1"
while read -r local_ref local_sha remote_ref remote_sha; do
    [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
    if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
        range="$local_sha"
    else
        range="$remote_sha..$local_sha"
    fi
    # Exclude the files that legitimately reference the sentinel string
    # (the script itself, the installed hook template, and the CI workflow).
    if git log -p "$range" -- \
            ':!scripts/link-example-locally.sh' \
            ':!.github/workflows/check-no-linked-example.yml' \
            2>/dev/null | grep -q 'link-locally-do-not-commit'; then
        echo "" >&2
        echo "✘ Refusing to push: commits in this range contain the" >&2
        echo "  link-locally-do-not-commit sentinel left behind by" >&2
        echo "  scripts/link-example-locally.sh." >&2
        echo "" >&2
        echo "  Undo the linking first:" >&2
        echo "    - Delete the pnpm.overrides block from root package.json" >&2
        echo "    - Revert workspace:* deps in the example's package.json" >&2
        echo "    - Remove the example line from pnpm-workspace.yaml" >&2
        echo "    - Run pnpm install" >&2
        echo "" >&2
        exit 1
    fi
done
HOOK_EOF
    chmod +x "$hook_path"
    err "Installed local pre-push hook at $hook_path"
else
    err "Pre-push hook already exists at $hook_path — leaving it alone."
    err "If it doesn't refuse commits containing link-locally-do-not-commit, add that check yourself."
fi

err "All good! Current example is now a local pnpm workspace."

# Step 8: Capture every change made above in one clearly-marked commit. This
# is always done so that the entire set of changes is atomic: drop this commit
# with `git rebase -i` when you're done testing to fully unlink. The pre-push
# hook and CI both refuse to accept this commit, so there's no risk of pushing
# it upstream.
if git is-dirty; then
    git commit -qa -F - <<EOF
⚠️ DO NOT PUSH THIS COMMIT TO GITHUB - Temporarily link $reldir locally

This commit was created by scripts/link-example-locally.sh and is intended
to stay on your local machine only. Before pushing to GitHub, remove it
with an interactive rebase:

    git rebase -i main

…then change "pick" to "drop" on the line for this commit, save, and exit.
After that, run \`pnpm install\` to restore node_modules.

The pre-push hook and CI will both refuse this commit, so pushing is
blocked until you've dropped it.
EOF
    err ""
    err "All changes have been captured in a single commit:"
    err ""
    err "    $(git log -1 --oneline)"
    err ""
    err "When you're done, drop that commit with git rebase -i. You cannot push"
    err "while that commit is in your branch."
    err ""
fi
