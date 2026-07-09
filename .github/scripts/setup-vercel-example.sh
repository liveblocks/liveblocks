#!/bin/bash
set -euo pipefail

# This script sets up an example on Vercel and Liveblocks.
# It's used by the `.github/workflows/setup-vercel-example.yml` GitHub Action.
# It's only meant for new examples so it will abort if an example is already set up.

vercel_api_url="https://api.vercel.com"
liveblocks_management_api_url="https://api.liveblocks.io/v2/management"
examples_branch="examples"
vercel_deploy_hook_name="Deploy example"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/setup-vercel-example.XXXXXX")"

example_name=""
framework=""
vercel_project_name=""
vercel_project_id=""
vercel_project_dashboard_url=""
liveblocks_project_name=""
liveblocks_project=""
liveblocks_project_id=""
root_directory=""
domain=""
env_example_path=""
liveblocks_key_env_name=""
liveblocks_key_type=""
vercel_liveblocks_env_name=""
vercel_deploy_hook_url=""
manual_env_names=()

cleanup() {
  rm -rf "${temporary_directory}"
}

trap cleanup EXIT

err() {
  echo "$@" >&2
}

trim() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  printf "%s" "${value}"
}

create_response_file() {
  mktemp "${temporary_directory}/response.XXXXXX"
}

check_required_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    err "Missing ${name}"
    exit 1
  fi
}

duplicate_setup_error() {
  local reason="$1"

  err "${reason}"

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## ❌ Example already exists"
      echo
      echo "${reason}"
      echo
    } >>"${GITHUB_STEP_SUMMARY}"
  fi

  exit 1
}

vercel_url() {
  if [[ "$1" == *"?"* ]]; then
    printf "%s%s&teamId=%s" "${vercel_api_url}" "$1" "${VERCEL_TEAM_ID}"
  else
    printf "%s%s?teamId=%s" "${vercel_api_url}" "$1" "${VERCEL_TEAM_ID}"
  fi
}

curl_vercel() {
  local method="$1"
  local url="$2"
  local response_file="$3"
  local body="${4:-}"
  local data_args=()

  [[ -n "${body}" ]] && data_args=(--data "${body}")

  curl --silent --show-error \
    --request "${method}" \
    --url "${url}" \
    --header "Authorization: Bearer ${VERCEL_API_TOKEN}" \
    --header "Content-Type: application/json" \
    "${data_args[@]}" \
    --output "${response_file}" \
    --write-out "%{http_code}"
}

curl_liveblocks() {
  local method="$1"
  local url="$2"
  local response_file="$3"
  local body="${4:-}"
  local data_args=()

  [[ -n "${body}" ]] && data_args=(--data "${body}")

  curl --silent --show-error \
    --request "${method}" \
    --url "${url}" \
    --header "Authorization: Bearer ${LIVEBLOCKS_MANAGEMENT_API_TOKEN}" \
    --header "Content-Type: application/json" \
    "${data_args[@]}" \
    --output "${response_file}" \
    --write-out "%{http_code}"
}

api_request() {
  local service_name="$1"
  local description="$2"
  local method="$3"
  local url="$4"
  local body="${5:-}"
  local response_file
  local status

  response_file="$(create_response_file)"

  echo >&2
  echo "${description}" >&2

  if [[ "${service_name}" == "Vercel" ]]; then
    status="$(curl_vercel "${method}" "${url}" "${response_file}" "${body}")" || {
      err "${description} failed before receiving a Vercel response"
      exit 1
    }
  else
    status="$(curl_liveblocks "${method}" "${url}" "${response_file}" "${body}")" || {
      err "${description} failed before receiving a Liveblocks response"
      exit 1
    }
  fi

  if [[ "${status}" -lt 200 || "${status}" -ge 300 ]]; then
    err "${description} failed with HTTP ${status}"
    cat "${response_file}" >&2
    exit 1
  fi

  cat "${response_file}"
}

vercel_request() {
  api_request "Vercel" "$@"
}

liveblocks_request() {
  api_request "Liveblocks" "$@"
}

require_inputs() {
  check_required_env "EXAMPLE_NAME"
  check_required_env "GITHUB_REPOSITORY"
  check_required_env "LIVEBLOCKS_MANAGEMENT_API_TOKEN"
  check_required_env "VERCEL_TEAM_ID"
  check_required_env "VERCEL_API_TOKEN"
}

read_example_inputs() {
  example_name="$(trim "${EXAMPLE_NAME}")"
  framework="$(trim "${FRAMEWORK:-}")"

  if [[ -z "${example_name}" ]]; then
    err "Missing example name"
    exit 1
  fi

  if [[ ! "${example_name}" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
    err "Example name must be lowercase letters, numbers, and hyphens only"
    exit 1
  fi

  root_directory="examples/${example_name}"

  if [[ ! -d "${root_directory}" ]]; then
    err "Could not find ${root_directory}"
    exit 1
  fi

  vercel_project_name="examples-${example_name}"
  liveblocks_project_name="Example - ${example_name}"
  domain="${example_name}.liveblocks.app"
  env_example_path="${root_directory}/.env.example"
}

read_env_example() {
  local env_line
  local env_name

  [[ ! -f "${env_example_path}" ]] && return

  # `.env.example` files in examples tell us which Liveblocks key Vercel needs.
  while IFS= read -r env_line || [[ -n "${env_line}" ]]; do
    env_line="$(trim "${env_line}")"

    [[ -z "${env_line}" || "${env_line}" == \#* || "${env_line}" != *=* ]] && continue

    env_name="$(trim "${env_line%%=*}")"

    [[ -z "${env_name}" ]] && continue

    # Look for variables like `LIVEBLOCKS_SECRET_KEY`, `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`, etc.
    if [[ "${env_name}" == *LIVEBLOCKS* && "${env_name}" == *PUBLIC_KEY ]]; then
      set_liveblocks_key_env_name "${env_name}" "public"
    elif [[ "${env_name}" == *LIVEBLOCKS* && "${env_name}" == *SECRET_KEY && "${env_name}" != *WEBHOOK* ]]; then
      set_liveblocks_key_env_name "${env_name}" "secret"
    else
      manual_env_names+=("${env_name}")
    fi
  done <"${env_example_path}"
}

set_liveblocks_key_env_name() {
  local env_name="$1"
  local key_type="$2"

  if [[ -n "${liveblocks_key_env_name}" ]]; then
    err "Found multiple Liveblocks API key variables in ${env_example_path}: ${liveblocks_key_env_name} and ${env_name}"
    exit 1
  fi

  liveblocks_key_env_name="${env_name}"
  liveblocks_key_type="${key_type}"
}


print_setup_overview() {
  echo "Setting up Vercel and Liveblocks example projects"
  echo "Example name: ${example_name}"
  echo "Vercel project name: ${vercel_project_name}"
  echo "Liveblocks project name: ${liveblocks_project_name}"
  echo "Root directory: ${root_directory}"
  echo "Vercel custom domain: ${domain}"
  echo "GitHub repository: ${GITHUB_REPOSITORY}"
  echo "Production branch: ${examples_branch}"
  echo "Framework: ${framework:-"(none)"}"
  echo "Environment template: ${env_example_path}"
  echo "Liveblocks API key variable: ${liveblocks_key_env_name:-"(none found)"}"
}

resolve_vercel_project_dashboard_url() {
  local team_response
  local team_slug

  # Source: https://vercel.com/docs/rest-api/reference/endpoints/teams/get-a-team
  team_response="$(
    vercel_request \
      "Fetching Vercel team metadata" \
      "GET" \
      "${vercel_api_url}/v2/teams/${VERCEL_TEAM_ID}"
  )"
  team_slug="$(jq -r '.slug // empty' <<<"${team_response}")"

  if [[ -n "${team_slug}" ]]; then
    vercel_project_dashboard_url="https://vercel.com/${team_slug}/${vercel_project_name}"
  else
    err "Warning: could not read team slug from GET /v2/teams/<team-id>; omitting Vercel dashboard project URL"
  fi
}

assert_no_existing_vercel_project() {
  local existing_vercel_project_response_file
  local existing_vercel_project_status

  # Source: https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name
  existing_vercel_project_response_file="$(create_response_file)"
  if ! existing_vercel_project_status="$(
    curl_vercel \
      "GET" \
      "$(vercel_url "/v10/projects/${vercel_project_name}")" \
      "${existing_vercel_project_response_file}"
  )"; then
    err "Looking up existing Vercel project failed before receiving a Vercel response"
    exit 1
  fi

  if [[ "${existing_vercel_project_status}" == "200" ]]; then
    duplicate_setup_error "Example '${example_name}' already exists: Vercel project '${vercel_project_name}' is already present."
  fi

  if [[ "${existing_vercel_project_status}" != "404" ]]; then
    err "Looking up existing Vercel project failed with HTTP ${existing_vercel_project_status}"
    cat "${existing_vercel_project_response_file}" >&2
    exit 1
  fi
}

assert_no_existing_liveblocks_project() {
  local liveblocks_cursor=""
  local liveblocks_projects_response
  local liveblocks_projects_url

  # Source: https://liveblocks.io/docs/api-reference/rest-api-endpoints#Management
  while true; do
    liveblocks_projects_url="${liveblocks_management_api_url}/projects?limit=100"

    if [[ -n "${liveblocks_cursor}" ]]; then
      liveblocks_projects_url="${liveblocks_projects_url}&cursor=$(jq -rn --arg value "${liveblocks_cursor}" '$value | @uri')"
    fi

    liveblocks_projects_response="$(
      liveblocks_request \
        "Looking up Liveblocks project" \
        "GET" \
        "${liveblocks_projects_url}"
    )"
    liveblocks_project="$(
      jq -c --arg name "${liveblocks_project_name}" \
        '.projects[]? | select(.name == $name)' \
        <<<"${liveblocks_projects_response}" \
        | head -n 1
    )"

    if [[ -n "${liveblocks_project}" ]]; then
      duplicate_setup_error "Example '${example_name}' already exists: Liveblocks project '${liveblocks_project_name}' is already present."
    fi

    liveblocks_cursor="$(jq -r '.nextCursor // empty' <<<"${liveblocks_projects_response}")"

    [[ -z "${liveblocks_cursor}" ]] && break
  done
}

preflight_setup() {
  assert_no_existing_vercel_project
  assert_no_existing_liveblocks_project
}

create_vercel_project() {
  local create_vercel_project_body
  local framework_json
  local vercel_project_response

  if [[ -n "${framework}" ]]; then
    framework_json="$(jq -n --arg framework "${framework}" '$framework')"
  else
    framework_json="null"
  fi

  create_vercel_project_body="$(
    jq -n \
      --arg name "${vercel_project_name}" \
      --arg root_directory "${root_directory}" \
      --arg repository "${GITHUB_REPOSITORY}" \
      --argjson framework "${framework_json}" \
      '{
        name: $name,
        buildCommand: "npm run build",
        installCommand: "npm install",
        rootDirectory: $root_directory,
        framework: $framework,
        gitRepository: {
          type: "github",
          repo: $repository
        }
      }'
  )"

  assert_no_existing_vercel_project

  # Source: https://vercel.com/docs/rest-api/projects/create-a-new-project
  vercel_project_response="$(
    vercel_request \
      "Creating Vercel project" \
      "POST" \
      "$(vercel_url "/v11/projects")" \
      "${create_vercel_project_body}"
  )"

  vercel_project_id="$(jq -r ".id // empty" <<<"${vercel_project_response}")"

  if [[ -z "${vercel_project_id}" ]]; then
    err "Vercel project response did not include an ID"
    echo "${vercel_project_response}" >&2
    exit 1
  fi
}

create_liveblocks_project() {
  local liveblocks_project_response

  assert_no_existing_liveblocks_project

  # Examples are public deployments, so we create a Liveblocks production project.
  # Production secret keys are only accessible once at creation time.
  liveblocks_project_response="$(
    liveblocks_request \
      "Creating Liveblocks production project" \
      "POST" \
      "${liveblocks_management_api_url}/projects" \
      "$(jq -n --arg name "${liveblocks_project_name}" '{ name: $name, type: "prod", versionCreationTimeout: false }')"
  )"
  liveblocks_project="$(jq -c '.project' <<<"${liveblocks_project_response}")"
  liveblocks_project_id="$(jq -r '.id // empty' <<<"${liveblocks_project}")"

  if [[ -z "${liveblocks_project_id}" ]]; then
    err "Liveblocks project response did not include an ID"
    echo "${liveblocks_project}" >&2
    exit 1
  fi
}

liveblocks_key_value() {
  if [[ "${liveblocks_key_type}" == "public" ]]; then
    ensure_liveblocks_public_key
    jq -r '.publicKey.value // empty' <<<"${liveblocks_project}"
  else
    ensure_liveblocks_secret_key
    jq -r '.secretKey.value // empty' <<<"${liveblocks_project}"
  fi
}

ensure_liveblocks_secret_key() {
  local liveblocks_secret_key_response
  local secret_key_value

  secret_key_value="$(jq -r '.secretKey.value // empty' <<<"${liveblocks_project}")"

  [[ -n "${secret_key_value}" ]] && return

  # Production secret keys are not returned at creation time, so roll one to obtain its value.
  # Source: https://liveblocks.io/docs/api-reference/rest-api-endpoints#roll-project-secret-api-key
  liveblocks_secret_key_response="$(
    liveblocks_request \
      "Rolling Liveblocks secret key" \
      "POST" \
      "${liveblocks_management_api_url}/projects/${liveblocks_project_id}/api-keys/secret/roll"
  )"
  secret_key_value="$(jq -r '.secretKey.value // empty' <<<"${liveblocks_secret_key_response}")"

  if [[ -z "${secret_key_value}" ]]; then
    err "Liveblocks secret key roll response did not include a value"
    echo "${liveblocks_secret_key_response}" >&2
    exit 1
  fi

  liveblocks_project="$(jq -c --arg value "${secret_key_value}" '.secretKey = { value: $value }' <<<"${liveblocks_project}")"
}

ensure_liveblocks_public_key() {
  local liveblocks_project_response
  local liveblocks_public_key_activated

  liveblocks_public_key_activated="$(jq -r '.publicKey.activated // false' <<<"${liveblocks_project}")"

  [[ "${liveblocks_public_key_activated}" == "true" ]] && return

  liveblocks_request \
    "Activating Liveblocks public key" \
    "POST" \
    "${liveblocks_management_api_url}/projects/${liveblocks_project_id}/api-keys/public/activate" \
    >/dev/null

  liveblocks_project_response="$(
    liveblocks_request \
      "Refreshing Liveblocks project" \
      "GET" \
      "${liveblocks_management_api_url}/projects/${liveblocks_project_id}"
  )"
  liveblocks_project="$(jq -c '.project' <<<"${liveblocks_project_response}")"
}

add_liveblocks_key_to_vercel() {
  local key_value

  [[ -z "${liveblocks_key_env_name}" ]] && return

  key_value="$(liveblocks_key_value)"

  if [[ -z "${key_value}" ]]; then
    err "Liveblocks project response did not include a ${liveblocks_key_type} key"
    echo "${liveblocks_project}" >&2
    exit 1
  fi

  vercel_request \
    "Adding Liveblocks API key to Vercel environment variables" \
    "POST" \
    "$(vercel_url "/v10/projects/${vercel_project_id}/env")" \
    "$(jq -n \
      --arg key "${liveblocks_key_env_name}" \
      --arg value "${key_value}" \
      '{
        key: $key,
        value: $value,
        type: "encrypted",
        target: ["production"]
      }')" \
    >/dev/null

  vercel_liveblocks_env_name="${liveblocks_key_env_name}"
}

add_manual_env_vars_to_vercel() {
  local manual_env_name

  ((${#manual_env_names[@]} == 0)) && return

  # Any non-Liveblocks variable in `.env.example` is added as an empty placeholder
  # for preview and production deployments. Their values must be filled in manually on Vercel later.
  for manual_env_name in "${manual_env_names[@]}"; do
    vercel_request \
      "Adding placeholder env var ${manual_env_name} to Vercel" \
      "POST" \
      "$(vercel_url "/v10/projects/${vercel_project_id}/env")" \
      "$(jq -n \
        --arg key "${manual_env_name}" \
        '{
          key: $key,
          value: "",
          type: "encrypted",
          target: ["preview", "production"]
        }')" \
      >/dev/null
  done
}

configure_vercel_project() {
  local framework_json
  local update_vercel_project_body

  if [[ -n "${framework}" ]]; then
    framework_json="$(jq -n --arg framework "${framework}" '$framework')"
  else
    framework_json="null"
  fi

  update_vercel_project_body="$(
    jq -n \
      --arg root_directory "${root_directory}" \
      --argjson framework "${framework_json}" \
      '{
        buildCommand: "npm run build",
        installCommand: "npm install",
        rootDirectory: $root_directory,
        framework: $framework,
        gitComments: {
          onCommit: false,
          onPullRequest: false
        }
      }'
  )"

  # Source: https://vercel.com/docs/rest-api/projects/update-an-existing-project
  vercel_request \
    "Updating Vercel project settings" \
    "PATCH" \
    "$(vercel_url "/v9/projects/${vercel_project_id}")" \
    "${update_vercel_project_body}" \
    >/dev/null

  # Source: https://github.com/vercel/terraform-provider-vercel/blob/main/client/project.go
  # It's an undocumented endpoint, more info: https://community.vercel.com/t/rest-api-docs-for-updating-production-git-branch/820
  vercel_request \
    "Setting Vercel production branch" \
    "PATCH" \
    "$(vercel_url "/v9/projects/${vercel_project_id}/branch")" \
    "$(jq -n --arg branch "${examples_branch}" '{ branch: $branch }')" \
    >/dev/null
}

create_vercel_deploy_hook() {
  local vercel_deploy_hook_response
  local vercel_project_response

  # Source: https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name
  vercel_project_response="$(
    vercel_request \
      "Refreshing Vercel project" \
      "GET" \
      "$(vercel_url "/v10/projects/${vercel_project_id}")"
  )"
  vercel_deploy_hook_url="$(
    jq -r \
      --arg name "${vercel_deploy_hook_name}" \
      --arg ref "${examples_branch}" \
      '.link.deployHooks[]? | select(.name == $name and .ref == $ref) | .url' \
      <<<"${vercel_project_response}" \
      | head -n 1
  )"

  if [[ -n "${vercel_deploy_hook_url}" ]]; then
    duplicate_setup_error "Example '${example_name}' already exists: deploy hook '${vercel_deploy_hook_name}' already exists for '${vercel_project_name}'."
  fi

  # Source: https://github.com/vercel/terraform-provider-vercel/blob/main/client/deploy_hooks.go
  # It's an undocumented endpoint, more info: https://community.vercel.com/t/rest-api-docs-for-updating-production-git-branch/820
  vercel_deploy_hook_response="$(
    vercel_request \
      "Creating Vercel Deploy Hook" \
      "POST" \
      "$(vercel_url "/v2/projects/${vercel_project_id}/deploy-hooks")" \
      "$(jq -n --arg name "${vercel_deploy_hook_name}" --arg ref "${examples_branch}" '{ name: $name, ref: $ref }')"
  )"
  vercel_deploy_hook_url="$(
    jq -r \
      --arg name "${vercel_deploy_hook_name}" \
      --arg ref "${examples_branch}" \
      '.url // (.link.deployHooks[]? | select(.name == $name and .ref == $ref) | .url) // empty' \
      <<<"${vercel_deploy_hook_response}" \
      | head -n 1
  )"

  if [[ -z "${vercel_deploy_hook_url}" ]]; then
    err "Vercel Deploy Hook response did not include a URL"
    echo "${vercel_deploy_hook_response:-${vercel_project_response}}" >&2
    exit 1
  fi
}

add_vercel_custom_domain() {
  local vercel_domain_exists
  local vercel_project_domains_response

  # Source: https://vercel.com/docs/rest-api/projects/retrieve-project-domains-by-project-by-id-or-name
  vercel_project_domains_response="$(
    vercel_request \
      "Checking Vercel custom domain" \
      "GET" \
      "$(vercel_url "/v9/projects/${vercel_project_id}/domains")"
  )"
  vercel_domain_exists="$(
    jq -r --arg name "${domain}" '.domains[]? | select(.name == $name) | .name' \
      <<<"${vercel_project_domains_response}" \
      | head -n 1
  )"

  if [[ -n "${vercel_domain_exists}" ]]; then
    duplicate_setup_error "Example '${example_name}' already exists: custom domain '${domain}' is already attached."
  fi

  # Source: https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project
  vercel_request \
    "Adding Vercel custom domain" \
    "POST" \
    "$(vercel_url "/v10/projects/${vercel_project_id}/domains")" \
    "$(jq -n --arg name "${domain}" '{ name: $name, gitBranch: null }')" \
    >/dev/null
}

print_success_log() {
  echo
  echo "Setup complete"
  echo "Vercel project: ${vercel_project_name}"
  echo "Liveblocks project: ${liveblocks_project_name}"
  echo "Vercel deployment URL: https://${domain}"
  if [[ -n "${vercel_project_dashboard_url}" ]]; then
    echo "Vercel project URL: ${vercel_project_dashboard_url}"
  fi
  if [[ -n "${vercel_liveblocks_env_name}" ]]; then
    echo "Vercel Liveblocks env var: ${vercel_liveblocks_env_name}"
  fi
  echo "Vercel Deploy Hook: ${vercel_deploy_hook_url}"
}

write_success_summary() {
  [[ -z "${GITHUB_STEP_SUMMARY:-}" ]] && return

  {
    echo "## ✅ Example deployed to Vercel"
    echo
    echo "\`${example_name}\` has been configured on Vercel and will deploy from the \`${examples_branch}\` branch."
    echo
    echo "🔗 Vercel deployment URL: https://${domain}"
    if [[ -n "${vercel_project_dashboard_url}" ]]; then
      echo "🗂️ Vercel URL: ${vercel_project_dashboard_url}"
    fi
    echo "🧱 Liveblocks project: \`${liveblocks_project_name}\`"
    echo
    echo "### Environment variables"
    echo
    if [[ -n "${vercel_liveblocks_env_name}" ]]; then
      echo "Added to Vercel for production:"
      echo
      echo "| Variable | Source |"
      echo "| --- | --- |"
      echo "| \`${vercel_liveblocks_env_name}\` | Liveblocks ${liveblocks_key_type} key |"
    else
      echo "No Liveblocks API key variable was found in \`${env_example_path}\`, so no Liveblocks key was added to Vercel."
    fi
    echo
    if ((${#manual_env_names[@]} > 0)); then
      echo "Added to Vercel for preview and production as empty placeholders (fill in their values manually):"
      echo
      for manual_env_name in "${manual_env_names[@]}"; do
        echo "- \`${manual_env_name}\`"
      done
      echo
    fi
    echo "### Vercel Deploy Hook"
    echo
    # We store deploy hooks publicly so we can also display them here.
    echo '```text'
    echo "${vercel_deploy_hook_url}"
    echo '```'
    echo
    echo "⚠️ Add this to \`.github/workflows/deploy-examples.yml\` on the \`${examples_branch}\` branch:"
    echo
    echo '```sh'
    echo "echo \"Triggering deployment for ${example_name}\""
    echo "curl -s -X POST ${vercel_deploy_hook_url}; echo"
    echo '```'
  } >>"${GITHUB_STEP_SUMMARY}"
}

main() {
  require_inputs
  read_example_inputs
  read_env_example
  print_setup_overview

  resolve_vercel_project_dashboard_url
  preflight_setup
  create_vercel_project
  create_liveblocks_project
  add_liveblocks_key_to_vercel
  add_manual_env_vars_to_vercel
  configure_vercel_project
  create_vercel_deploy_hook
  add_vercel_custom_domain

  print_success_log
  write_success_summary
}

main "$@"
