#!/bin/bash
set -eu

err () {
    echo "$@" >&2
}

check_is_valid_github_tag () {
    echo "Checking if tag $1 is valid"
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

check_npm_tag_allowed_on_branch () {
  NPM_TAG=$(get_npm_tag "$1")
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  echo "Checking if npm tag $NPM_TAG is allowed on branch $CURRENT_BRANCH"
  if [ "$NPM_TAG" == "beta" ] && [ "$CURRENT_BRANCH" != "beta" ]; then
    err "Error! Only the beta tag is allowed on beta branch"
    exit 2
  fi

  if [ "$NPM_TAG" == "latest" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    err "Error! You can only push a version without an npm tag on the main branch"
    exit 2
  fi
}

check_git_tag_exists () {
  git fetch --all --tags --quiet
  echo "Checking if git tag $1 already exists"
  if [ $(git tag -l "$1") ]; then
    err "Error! Github tag already exists"
    exit 2
  fi 
}

check_is_valid_github_tag "$1"
check_npm_tag_allowed_on_branch "$1"
check_git_tag_exists "$1"