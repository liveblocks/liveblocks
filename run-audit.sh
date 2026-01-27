#!/usr/bin/env bash
set -euo pipefail

# ===== CONFIG =====
EXAMPLES_DIR="examples"

declare -a SKIPPED_EXAMPLES=(
  "javascript-live-cursors"
  "javascript-todo-list"
  "nextjs-3d-builder"
  "nextjs-ai-app-builder"
  "nextjs-ai-calendar"
  "nextjs-ai-chats"
  "nextjs-ai-dashboard-reports"
  "nextjs-ai-popup"
  "nextjs-ai-support"
  "nextjs-blocknote"
  "nextjs-comments"
  "nextjs-comments-ai"
  "nextjs-comments-audio"
  "nextjs-comments-canvas"
  "nextjs-comments-emails-resend"
  "nextjs-comments-emails-sendgrid"
  "nextjs-comments-notifications"
  "nextjs-comments-overlay"
  "nextjs-comments-primitives"
  "nextjs-comments-search"
  "nextjs-comments-tiptap"
  "nextjs-comments-video"
  "nextjs-connection-status"
  "nextjs-dashboard"
  "nextjs-form"
  "nextjs-lexical"
  "nextjs-lexical-emails-resend"
  "nextjs-linear-like-issue-tracker"
  "nextjs-live-avatars"
  "nextjs-live-avatars-advanced"
  "nextjs-live-cursors"
  "nextjs-live-cursors-advanced"
  "nextjs-live-cursors-chat"
  "nextjs-live-cursors-scroll"
  "nextjs-live-form-selection"
  "nextjs-nextauth-google-avatars"
  "nextjs-notification-settings"
  "nextjs-notifications-custom"
  "nextjs-notion-like-ai-editor"
  "nextjs-spreadsheet-advanced"
  "nextjs-tiptap"
  "nextjs-tiptap-advanced"
  "nextjs-tiptap-ai"
  "nextjs-tiptap-emails-resend"
  "nextjs-tldraw-whiteboard-storage"
  "nextjs-tldraw-whiteboard-yjs"
  "nextjs-todo-list"
  "nextjs-whiteboard"
  "nextjs-whiteboard-advanced"
  "nextjs-yjs-blocknote"
  "nextjs-yjs-blocknote-advanced"
  "nextjs-yjs-codemirror"
  "nextjs-yjs-lexical"
  "nextjs-yjs-monaco"
  "nextjs-yjs-quill"
  "nextjs-yjs-slate"
  "nextjs-yjs-tiptap"
  "nuxtjs-live-avatars"
  "react-comments"
  "react-native-todo-list"
  "redux-todo-list"
  "redux-whiteboard"
  "solidjs-live-avatars"
  "solidjs-live-cursors"
  "sveltekit-live-avatars"
  "sveltekit-live-cursors"
)

# ===== FUNCTIONS =====
is_skipped() {
  local dir="$1"
  for skipped in "${SKIPPED_EXAMPLES[@]:-}"; do
    [[ "$skipped" == "$dir" ]] && return 0
  done
  return 1
}

add_to_skipped() {
  local dir="$1"
  local script_file="$0"

  sed -i.bak "/^declare -a SKIPPED_EXAMPLES=(/,/^)/ {
    /^)/ i\\
  \"$dir\"
  }" "$script_file"

  rm -f "${script_file}.bak"
}

# Returns 0 if vulnerabilities exist, 1 if clean
has_vulns() {
  if npm audit --audit-level=low >/dev/null 2>&1; then
    return 1
  else
    return 0
  fi
}

package_installed() {
  local pkg="$1"
  npm ls "$pkg" >/dev/null 2>&1
}

# ===== MAIN LOOP =====
for dir in "$EXAMPLES_DIR"/*; do
  [[ -d "$dir" ]] || continue

  name="$(basename "$dir")"

  if is_skipped "$name"; then
    echo "⏭  Skipping $name (already clean)"
    continue
  fi

  if [[ ! -f "$dir/package.json" ]]; then
    echo "⚠️  Skipping $name (no package.json)"
    continue
  fi

  echo "▶️  Processing example: $name"
  pushd "$dir" >/dev/null

  # ----- ESLINT / NEXT ESLINT UPGRADES -----
  eslint_packages=()

  for pkg in eslint eslint-plugin-next eslint-config-next; do
    if package_installed "$pkg"; then
      eslint_packages+=("$pkg@latest")
    fi
  done

  if [[ "${#eslint_packages[@]}" -gt 0 ]]; then
    echo "⬆️  [$name] upgrading existing eslint-related packages:"
    printf '   - %s\n' "${eslint_packages[@]%@latest}"

    npm install "${eslint_packages[@]}"

    echo "🏗️  [$name] running build after eslint upgrade"
    npm run build
  fi

  # ----- AUDIT -----
  echo "🔍 [$name] npm audit"
  if has_vulns; then
    echo "🛠  [$name] vulnerabilities detected — running npm audit fix"
    npm audit fix || true

    echo "🔍 [$name] re-running npm audit"
    if has_vulns; then
      echo
      echo "❌ AUDIT FAILED FOR EXAMPLE: $name"
      echo "❌ Vulnerabilities remain after npm audit fix"
      echo "❌ Fix this example manually, then re-run the script"
      echo
      popd >/dev/null
      exit 1
    fi
  else
    echo "✅ [$name] no vulnerabilities found"
  fi

  echo "✅ $name is clean"
  popd >/dev/null

  add_to_skipped "$name"
done

echo "🎉 All examples processed successfully."
