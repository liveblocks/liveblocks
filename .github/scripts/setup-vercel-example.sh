#!/bin/bash
set -euo pipefail

# This script sets up a Vercel example project and a Liveblocks project.
# It's used by the `.github/workflows/setup-vercel-example.yml` GitHub Action.

vercel_api_url="https://api.vercel.com"
liveblocks_management_api_url="https://api.liveblocks.io/v2/management"
examples_branch="examples"
vercel_deploy_hook_name="Deploy example"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/setup-vercel-example.XXXXXX")"

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

vercel_url() {
  if [[ "$1" == *"?"* ]]; then
    printf "%s%s&teamId=%s" "${vercel_api_url}" "$1" "${VERCEL_TEAM_ID}"
  else
    printf "%s%s?teamId=%s" "${vercel_api_url}" "$1" "${VERCEL_TEAM_ID}"
  fi
}

create_response_file() {
  mktemp "${temporary_directory}/response.XXXXXX"
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

vercel_request() {
  local description="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local response_file
  local status

  response_file="$(create_response_file)"

  echo >&2
  echo "${description}" >&2

  if ! status="$(curl_vercel "${method}" "${url}" "${response_file}" "${body}")"; then
    err "${description} failed before receiving a Vercel response"
    exit 1
  fi

  if [[ "${status}" -lt 200 || "${status}" -ge 300 ]]; then
    err "${description} failed with HTTP ${status}"
    cat "${response_file}" >&2
    exit 1
  fi

  cat "${response_file}"
}

liveblocks_request() {
  local description="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local response_file
  local status

  response_file="$(create_response_file)"

  echo >&2
  echo "${description}" >&2

  if ! status="$(curl_liveblocks "${method}" "${url}" "${response_file}" "${body}")"; then
    err "${description} failed before receiving a Liveblocks response"
    exit 1
  fi

  if [[ "${status}" -lt 200 || "${status}" -ge 300 ]]; then
    err "${description} failed with HTTP ${status}"
    cat "${response_file}" >&2
    exit 1
  fi

  cat "${response_file}"
}

check_required_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    err "Missing ${name}"
    exit 1
  fi
}

check_required_env "EXAMPLE_NAME"
check_required_env "GITHUB_REPOSITORY"
check_required_env "LIVEBLOCKS_MANAGEMENT_API_TOKEN"
check_required_env "VERCEL_TEAM_ID"
check_required_env "VERCEL_API_TOKEN"

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

if [[ ! -d "examples/${example_name}" ]]; then
  err "Could not find examples/${example_name}"
  exit 1
fi

vercel_project_name="examples-${example_name}"
liveblocks_project_name="Example - ${example_name}"
root_directory="examples/${example_name}"
domain="${example_name}.liveblocks.app"
env_example_path="${root_directory}/.env.example"
liveblocks_key_env_name=""
liveblocks_key_type=""
manual_env_names=()

if [[ -f "${env_example_path}" ]]; then
  while IFS= read -r env_line || [[ -n "${env_line}" ]]; do
    env_line="$(trim "${env_line}")"

    [[ -z "${env_line}" || "${env_line}" == \#* || "${env_line}" != *=* ]] && continue

    env_name="$(trim "${env_line%%=*}")"

    [[ -z "${env_name}" ]] && continue

    if [[ "${env_name}" == *LIVEBLOCKS* && "${env_name}" == *PUBLIC_KEY ]]; then
      if [[ -n "${liveblocks_key_env_name}" ]]; then
        err "Found multiple Liveblocks API key variables in ${env_example_path}: ${liveblocks_key_env_name} and ${env_name}"
        exit 1
      fi

      liveblocks_key_env_name="${env_name}"
      liveblocks_key_type="public"
    elif [[ "${env_name}" == *LIVEBLOCKS* && "${env_name}" == *SECRET_KEY && "${env_name}" != *WEBHOOK* ]]; then
      if [[ -n "${liveblocks_key_env_name}" ]]; then
        err "Found multiple Liveblocks API key variables in ${env_example_path}: ${liveblocks_key_env_name} and ${env_name}"
        exit 1
      fi

      liveblocks_key_env_name="${env_name}"
      liveblocks_key_type="secret"
    else
      manual_env_names+=("${env_name}")
    fi
  done <"${env_example_path}"
fi

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

# Resolve the Vercel team URL segment for dashboard links.
# Source: https://vercel.com/docs/rest-api/reference/endpoints/teams/get-a-team
team_response="$(
  vercel_request \
    "Fetching Vercel team metadata" \
    "GET" \
    "${vercel_api_url}/v2/teams/${VERCEL_TEAM_ID}"
)"
team_slug="$(jq -r '.slug // empty' <<<"${team_response}")"

vercel_project_dashboard_url=""
if [[ -n "${team_slug}" ]]; then
  vercel_project_dashboard_url="https://vercel.com/${team_slug}/${vercel_project_name}"
else
  err "Warning: could not read team slug from GET /v2/teams/<team-id>; omitting Vercel dashboard project URL"
fi

create_vercel_project_body="$(
  jq -n \
    --arg name "${vercel_project_name}" \
    --arg root_directory "${root_directory}" \
    --arg repository "${GITHUB_REPOSITORY}" \
    --argjson framework "$(
      # Source: https://vercel.com/docs/rest-api/projects/create-a-new-project#framework
      [[ -n "${framework}" ]] \
        && jq -n --arg f "${framework}" '$f' \
        || echo "null"
    )" \
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

# Create a Vercel project for this GitHub repository.
# Source: https://vercel.com/docs/rest-api/projects/create-a-new-project
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
  echo
  echo "Found existing Vercel project, updating it instead of creating a duplicate"
  vercel_project_response="$(cat "${existing_vercel_project_response_file}")"
elif [[ "${existing_vercel_project_status}" == "404" ]]; then
  vercel_project_response="$(
    vercel_request \
      "Creating Vercel project" \
      "POST" \
      "$(vercel_url "/v11/projects")" \
      "${create_vercel_project_body}"
  )"
else
  err "Looking up existing Vercel project failed with HTTP ${existing_vercel_project_status}"
  cat "${existing_vercel_project_response_file}" >&2
  exit 1
fi

vercel_project_id="$(jq -r ".id // empty" <<<"${vercel_project_response}")"

if [[ -z "${vercel_project_id}" ]]; then
  err "Vercel project response did not include an ID"
  echo "${vercel_project_response}" >&2
  exit 1
fi

# Find or create the Liveblocks project backing this example.
# Source: https://liveblocks.io/docs/api-reference/rest-api-endpoints#Management
liveblocks_project=""
liveblocks_cursor=""

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
    echo
    echo "Found existing Liveblocks project"
    break
  fi

  liveblocks_cursor="$(jq -r '.nextCursor // empty' <<<"${liveblocks_projects_response}")"

  [[ -z "${liveblocks_cursor}" ]] && break
done

if [[ -z "${liveblocks_project}" ]]; then
  liveblocks_project_response="$(
    liveblocks_request \
      "Creating Liveblocks production project" \
      "POST" \
      "${liveblocks_management_api_url}/projects" \
      "$(jq -n --arg name "${liveblocks_project_name}" '{ name: $name, type: "prod", versionCreationTimeout: false }')"
  )"
  liveblocks_project="$(jq -c '.project' <<<"${liveblocks_project_response}")"
fi

liveblocks_project_id="$(jq -r '.id // empty' <<<"${liveblocks_project}")"

if [[ -z "${liveblocks_project_id}" ]]; then
  err "Liveblocks project response did not include an ID"
  echo "${liveblocks_project}" >&2
  exit 1
fi

vercel_liveblocks_env_name=""
if [[ -n "${liveblocks_key_env_name}" ]]; then
  if [[ "${liveblocks_key_type}" == "public" ]]; then
    liveblocks_public_key_activated="$(jq -r '.publicKey.activated // false' <<<"${liveblocks_project}")"

    if [[ "${liveblocks_public_key_activated}" != "true" ]]; then
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
    fi

    liveblocks_key_value="$(jq -r '.publicKey.value // empty' <<<"${liveblocks_project}")"
  else
    liveblocks_key_value="$(jq -r '.secretKey.value // empty' <<<"${liveblocks_project}")"
  fi

  if [[ -z "${liveblocks_key_value}" ]]; then
    err "Liveblocks project response did not include a ${liveblocks_key_type} key"
    echo "${liveblocks_project}" >&2
    exit 1
  fi

  vercel_request \
    "Adding Liveblocks API key to Vercel environment variables" \
    "POST" \
    "$(vercel_url "/v10/projects/${vercel_project_id}/env?upsert=true")" \
    "$(jq -n \
      --arg key "${liveblocks_key_env_name}" \
      --arg value "${liveblocks_key_value}" \
      '{
        key: $key,
        value: $value,
        type: "encrypted",
        target: ["production"]
      }')" \
    >/dev/null

  vercel_liveblocks_env_name="${liveblocks_key_env_name}"
fi

update_vercel_project_body="$(
  jq -n \
    --arg root_directory "${root_directory}" \
    --argjson framework "$(
      [[ -n "${framework}" ]] \
        && jq -n --arg f "${framework}" '$f' \
        || echo "null"
    )" \
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

# Keep the Vercel project settings in sync on first runs and reruns.
# Also disable Vercel for GitHub PR and commit comments.
# Source: https://vercel.com/docs/rest-api/projects/update-an-existing-project
vercel_request \
  "Updating Vercel project settings" \
  "PATCH" \
  "$(vercel_url "/v9/projects/${vercel_project_id}")" \
  "${update_vercel_project_body}" \
  >/dev/null

# Set the production branch to the `examples` branch.
# Source: https://raw.githubusercontent.com/vercel/terraform-provider-vercel/main/client/project.go
vercel_request \
  "Setting production branch" \
  "PATCH" \
  "$(vercel_url "/v9/projects/${vercel_project_id}/branch")" \
  "$(jq -n --arg branch "${examples_branch}" '{ branch: $branch }')" \
  >/dev/null

# Read the latest Vercel project state so reruns can reuse existing deploy hooks.
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

# Create a Vercel deploy hook for the `examples` branch.
# Source: https://raw.githubusercontent.com/vercel/terraform-provider-vercel/fb57c95e/client/deploy_hooks.go
vercel_deploy_hook_response=""
if [[ -n "${vercel_deploy_hook_url}" ]]; then
  echo
  echo "Found existing Vercel Deploy Hook"
else
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
fi

if [[ -z "${vercel_deploy_hook_url}" ]]; then
  err "Vercel Deploy Hook response did not include a URL"
  echo "${vercel_deploy_hook_response:-${vercel_project_response}}" >&2
  exit 1
fi

# Check whether the Vercel custom domain already exists.
# Source: https://github.com/vercel/sdk/blob/HEAD/docs/sdks/projects/README.md#getprojectdomains
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

# Add a Vercel custom domain for this example.
# Source: https://github.com/vercel/sdk/blob/HEAD/docs/sdks/projects/README.md#addprojectdomain
if [[ -n "${vercel_domain_exists}" ]]; then
  echo
  echo "Found existing Vercel custom domain"
else
  vercel_request \
    "Adding Vercel custom domain" \
    "POST" \
    "$(vercel_url "/v10/projects/${vercel_project_id}/domains")" \
    "$(jq -n --arg name "${domain}" '{ name: $name, gitBranch: null }')" \
    >/dev/null
fi

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

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
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
      echo "Still needs to be added manually on Vercel:"
      echo
      for manual_env_name in "${manual_env_names[@]}"; do
        echo "- \`${manual_env_name}\`"
      done
      echo
    fi
    echo "### Vercel Deploy Hook"
    echo
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
fi
