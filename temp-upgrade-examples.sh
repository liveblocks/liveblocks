#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"

echo "Starting dependency upgrades (skipping SolidJS examples)..."

for dir in examples/*; do
  if [ -f "$dir/package.json" ]; then
    cd "$dir"

    # --- SKIP SOLIDJS EXAMPLES ENTIRELY ---
    if jq -e '.dependencies["solid-js"] // .devDependencies["solid-js"]' package.json > /dev/null; then
      echo "----------------------------------------"
      echo "Skipping $dir (SolidJS example)"
      echo "----------------------------------------"
      cd "$ROOT_DIR"
      continue
    fi

    echo "----------------------------------------"
    echo "Processing $dir"
    echo "----------------------------------------"

    rm -rf node_modules package-lock.json

    # 1. Upgrade React / React DOM forward only
    npx npm-check-updates \
      react react-dom \
      --target semver \
      -u

    # 2. Upgrade Next.js to latest
    npx npm-check-updates \
      next \
      -u

    # 3. Upgrade all remaining deps to latest PATCH only
    npx npm-check-updates \
      --target patch \
      '/^(?!react$|react-dom$|next$).*$/' \
      -u

    npm install

    # 4. Run Next.js codemods only if Next.js is present
    if jq -e '.dependencies.next // .devDependencies.next' package.json > /dev/null; then
      echo "Next.js detected – running codemods"
      npx @next/codemod@latest upgrade || true
    fi

    cd "$ROOT_DIR"
  fi
done

echo
echo "========================================"
echo "Dependency upgrade phase complete."
echo "========================================"
