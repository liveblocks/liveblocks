#!/bin/bash
set -eu

err () {
    echo "$@" >&2
}

# Tag format: v1.2.3 OR v1.2.3-<tag>
check_is_valid_github_tag () {
    if ! [[ "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+)?$ ]]; then
        err "Invalid tag: $1"
        err "Tag must be in the form of vX.Y.Z or vX.Y.Z-<tag>"
        exit 2
    fi
}

get_npm_tag () {
  if grep -q "-" <<< "$1"; then
      echo "${1##*-}" | sed 's/[0-9]//g'
  else 
      echo "latest"
  fi
}

check_tag_allowed_on_branch () {
  NPM_TAG=$(get_npm_tag "$1")
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  if [ "$NPM_TAG" == "beta" ] && [ "$CURRENT_BRANCH" != "beta" ]; then
    err "Error! Only the beta tag is allowed on beta branch"
    exit 2
  fi

  if [ "$NPM_TAG" == "latest" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    err "Error! You can only push a version without tag on the main branch"
    exit 2
  fi
}

create_and_push_tag () {
  git tag "$1" -m "Release $1"
  git push origin "$1"
  git tag -d "$1"
}


check_is_valid_github_tag "$1"
check_tag_allowed_on_branch "$1"
create_and_push_tag "$1"
