#!/bin/bash
set -eu

err () {
    echo "$@" >&2
}

check_is_valid_npm_version () {
    if ! [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+)?$ ]]; then
        err "Invalid version: $1"
        err "Version must be in the form of X.Y.Z or X.Y.Z-<tag>"
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

check_npm_tag_allowed_on_branch () {
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

check_git_tag_exists() {
  if git rev-parse "$1" >/dev/null 2>&1; then
    err "Error! Tag $1 already exists"
    exit 2
  fi
}



check_is_valid_npm_version "$1"
check_npm_tag_allowed_on_branch "$1"
check_git_tag_exists "v$1"