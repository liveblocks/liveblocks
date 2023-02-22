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

# Check branch is main or beta, only allow tags without -<tag> on main
check_current_branch () {
  git branch --show-current | grep -E "^(main|beta)$" || {
      err "Tagging is only allowed on main or beta branches"
      exit 2
  }
}

check_tag_does_not_exist () {
  git tag -l "$1" | grep -E "^$1$" && {
      err "Tag $1 already exists"
      exit 2
  }
  echo "Tag $1 does not exist yet!"
}

create_and_push_tag () {
  echo "Creating tag $1"
  git tag "$1" -m "Release $1" && git push origin "$1"
  echo "Tag $1 created and pushed"
}

# check_current_branch
check_is_valid_github_tag "$1"
check_tag_does_not_exist "$1"
# TODO: check tags without -<tag> are only allowed on main
create_and_push_tag "$1"