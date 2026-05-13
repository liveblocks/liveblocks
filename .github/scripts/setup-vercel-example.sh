#!/bin/bash
set -euo pipefail

vercel_api_url="https://api.vercel.com"
examples_branch="examples"
deploy_hook_name="Deploy example"
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
  printf "%s%s?teamId=%s" "${vercel_api_url}" "$1" "${VERCEL_TEAM_ID}"
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
    --header "Authorization: Bearer ${VERCEL_TOKEN}" \
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

check_required_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    err "Missing ${name}"
    exit 1
  fi
}

check_required_env "EXAMPLE_NAME"
check_required_env "GITHUB_REPOSITORY"
check_required_env "VERCEL_TEAM_ID"
check_required_env "VERCEL_TOKEN"

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

project_name="examples-${example_name}"
root_directory="examples/${example_name}"
domain="${example_name}.liveblocks.app"

echo "Setting up Vercel example project"
echo "Example name: ${example_name}"
echo "Project name: ${project_name}"
echo "Root directory: ${root_directory}"
echo "Custom domain: ${domain}"
echo "GitHub repository: ${GITHUB_REPOSITORY}"
echo "Production branch: ${examples_branch}"
echo "Framework: ${framework:-"(none)"}"

create_project_body="$(
  jq -n \
    --arg name "${project_name}" \
    --arg root_directory "${root_directory}" \
    --arg repository "${GITHUB_REPOSITORY}" \
    '{
      name: $name,
      buildCommand: "npm run build",
      installCommand: "npm install",
      rootDirectory: $root_directory,
      gitRepository: {
        type: "github",
        repo: $repository
      }
    }'
)"

if [[ -n "${framework}" ]]; then
  # Source: https://vercel.com/docs/rest-api/projects/create-a-new-project#framework
  create_project_body="$(
    jq --arg framework "${framework}" '.framework = $framework' <<<"${create_project_body}"
  )"
fi

# Create a Vercel project for this GitHub repository.
# Source: https://vercel.com/docs/rest-api/projects/create-a-new-project
existing_project_response_file="$(create_response_file)"
if ! existing_project_status="$(
  curl_vercel \
    "GET" \
    "$(vercel_url "/v10/projects/${project_name}")" \
    "${existing_project_response_file}"
)"; then
  err "Looking up existing Vercel project failed before receiving a Vercel response"
  exit 1
fi

if [[ "${existing_project_status}" == "200" ]]; then
  echo
  echo "Found existing Vercel project, updating it instead of creating a duplicate"
  project_response="$(cat "${existing_project_response_file}")"
elif [[ "${existing_project_status}" == "404" ]]; then
  project_response="$(
    vercel_request \
      "Creating Vercel project" \
      "POST" \
      "$(vercel_url "/v11/projects")" \
      "${create_project_body}"
  )"
else
  err "Looking up existing Vercel project failed with HTTP ${existing_project_status}"
  cat "${existing_project_response_file}" >&2
  exit 1
fi

project_id="$(jq -r ".id // empty" <<<"${project_response}")"

if [[ -z "${project_id}" ]]; then
  err "Vercel project response did not include an ID"
  echo "${project_response}" >&2
  exit 1
fi

update_project_body="$(
  jq -n \
    --arg root_directory "${root_directory}" \
    '{
      buildCommand: "npm run build",
      installCommand: "npm install",
      rootDirectory: $root_directory,
      gitComments: {
        onCommit: false,
        onPullRequest: false
      }
    }'
)"

if [[ -n "${framework}" ]]; then
  update_project_body="$(
    jq --arg framework "${framework}" '.framework = $framework' <<<"${update_project_body}"
  )"
fi

# Keep the project settings in sync on first runs and reruns.
# Also disable Vercel for GitHub PR and commit comments.
# Source: https://vercel.com/docs/rest-api/projects/update-an-existing-project
vercel_request \
  "Updating Vercel project settings" \
  "PATCH" \
  "$(vercel_url "/v9/projects/${project_id}")" \
  "${update_project_body}" \
  >/dev/null

# Set the production branch to the `examples` branch.
# Source: https://raw.githubusercontent.com/vercel/terraform-provider-vercel/main/client/project.go
vercel_request \
  "Setting production branch" \
  "PATCH" \
  "$(vercel_url "/v9/projects/${project_id}/branch")" \
  "$(jq -n --arg branch "${examples_branch}" '{ branch: $branch }')" \
  >/dev/null

# Read the latest project state so reruns can reuse existing deploy hooks.
# Source: https://vercel.com/docs/rest-api/projects/find-a-project-by-id-or-name
project_response="$(
  vercel_request \
    "Refreshing Vercel project" \
    "GET" \
    "$(vercel_url "/v10/projects/${project_id}")"
)"
deploy_hook_url="$(
  jq -r \
    --arg name "${deploy_hook_name}" \
    --arg ref "${examples_branch}" \
    '.link.deployHooks[]? | select(.name == $name and .ref == $ref) | .url' \
    <<<"${project_response}" \
    | head -n 1
)"

# Create a Vercel deploy hook for the `examples` branch.
# Source: https://raw.githubusercontent.com/vercel/terraform-provider-vercel/fb57c95e/client/deploy_hooks.go
deploy_hook_response=""
if [[ -n "${deploy_hook_url}" ]]; then
  echo
  echo "Found existing Vercel Deploy Hook"
else
  deploy_hook_response="$(
    vercel_request \
      "Creating Vercel Deploy Hook" \
      "POST" \
      "$(vercel_url "/v2/projects/${project_id}/deploy-hooks")" \
      "$(jq -n --arg name "${deploy_hook_name}" --arg ref "${examples_branch}" '{ name: $name, ref: $ref }')"
  )"
  deploy_hook_url="$(
    jq -r \
      --arg name "${deploy_hook_name}" \
      --arg ref "${examples_branch}" \
      '.url // (.link.deployHooks[]? | select(.name == $name and .ref == $ref) | .url) // empty' \
      <<<"${deploy_hook_response}" \
      | head -n 1
  )"
fi

if [[ -z "${deploy_hook_url}" ]]; then
  err "Deploy Hook response did not include a URL"
  echo "${deploy_hook_response:-${project_response}}" >&2
  exit 1
fi

# Check whether a custom domain already exists.
# Source: https://github.com/vercel/sdk/blob/HEAD/docs/sdks/projects/README.md#getprojectdomains
project_domains_response="$(
  vercel_request \
    "Checking custom domain" \
    "GET" \
    "$(vercel_url "/v9/projects/${project_id}/domains")"
)"
domain_exists="$(
  jq -r --arg name "${domain}" '.domains[]? | select(.name == $name) | .name' \
    <<<"${project_domains_response}" \
    | head -n 1
)"

# Add a custom domain for this example.
# Source: https://github.com/vercel/sdk/blob/HEAD/docs/sdks/projects/README.md#addprojectdomain
if [[ -n "${domain_exists}" ]]; then
  echo
  echo "Found existing custom domain"
else
  vercel_request \
    "Adding custom domain" \
    "POST" \
    "$(vercel_url "/v10/projects/${project_id}/domains")" \
    "$(jq -n --arg name "${domain}" '{ name: $name, gitBranch: null }')" \
    >/dev/null
fi

echo
echo "Setup complete"
echo "Project: ${project_name}"
echo "Domain: https://${domain}"
echo "Deploy Hook: ${deploy_hook_url}"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## ✅ Example deployed to Vercel"
    echo
    echo "\`${example_name}\` has been configured on Vercel and will deploy from the \`${examples_branch}\` branch."
    echo
    echo "🔗 Public URL: https://${domain}"
    echo
    echo "### Deploy Hook"
    echo
    echo '```text'
    echo "${deploy_hook_url}"
    echo '```'
    echo
    echo "Add this to \`.github/workflows/deploy-examples.yml\` on the \`${examples_branch}\` branch:"
    echo
    echo '```sh'
    echo "echo \"Triggering deployment for ${example_name}\""
    echo "curl -s -X POST ${deploy_hook_url}; echo"
    echo '```'
  } >>"${GITHUB_STEP_SUMMARY}"
fi
