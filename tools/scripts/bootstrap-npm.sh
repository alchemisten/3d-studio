#!/usr/bin/env bash
# One-time setup for packages that do not exist on npm yet.
# npm can only attach a trusted publisher to an existing package, so this publishes a
# placeholder (dist-tag "bootstrap", so "latest" stays free for the real 1.0.0) and then
# registers the GitHub Actions trusted publisher for release.yml.
#
# Needs an npm account that can publish to the @schablone scope (interactive login + 2FA).
# Usage: tools/scripts/bootstrap-npm.sh [--dry-run]
set -euo pipefail

REPO="alchemisten/3d-studio"
WORKFLOW="release.yml"
REGISTRY="https://registry.npmjs.org/"
npm_public() {
  npm "$@" "--registry=$REGISTRY" "--@schablone:registry=$REGISTRY"
}
PACKAGES=(
  3d-studio
  3d-studio-ui
  3d-studio-scene-preview
  3d-studio-core
  3d-studio-feature-skybox
  3d-studio-feature-color-switcher
  3d-studio-feature-material-variants
  3d-studio-feature-beauty-shot
  3d-studio-feature-floor
  3d-studio-feature-wireframe
  3d-studio-feature-camera-rotation
  3d-studio-feature-light-scenarios
  3d-studio-feature-animation
  3d-studio-feature-highlights
)
dry="${1:-}"
if [[ $# -gt 1 || ( -n "$dry" && "$dry" != "--dry-run" ) ]]; then
  echo "Usage: bash tools/scripts/bootstrap-npm.sh [--dry-run]" >&2
  exit 2
fi
if [[ "$dry" == "--dry-run" ]]; then
  for name in "${PACKAGES[@]}"; do
    echo "@schablone/$name: create 0.0.1 under bootstrap if missing on $REGISTRY; configure $REPO / $WORKFLOW"
  done
  echo "Dry run only: no login, registry checks, publishing, or trust changes performed."
  exit 0
fi

export npm_config_fetch_timeout=30000
IFS=. read -r npm_major npm_minor npm_patch <<< "$(npm_public --version)"
if (( npm_major < 11 || (npm_major == 11 && npm_minor < 15) )); then
  echo "npm >=11.15.0 is required. Run: npm install -g 'npm@^11.15.0'" >&2
  exit 1
fi
if ! npm_public whoami; then
  echo "Authentication required. Run in PowerShell: npm.cmd login --auth-type=web --registry=$REGISTRY" >&2
  echo "Complete the browser login, then run npm whoami. Retry this script only when it prints your username." >&2
  exit 1
fi

dir="$(mktemp -d)"
mkdir "$dir/package"
cleanup() {
  rm -f -- "$dir/package/package.json" "$dir/registry-error"
  rmdir -- "$dir/package"
  rmdir -- "$dir"
}
trap cleanup EXIT

for name in "${PACKAGES[@]}"; do
  pkg="@schablone/$name"
  if npm_public view "$pkg@*" version >/dev/null 2>"$dir/registry-error"; then
    echo "$pkg exists, skipping placeholder publish"
  else
    if [[ "$(<"$dir/registry-error")" != *E404* ]]; then
      cat "$dir/registry-error" >&2
      echo "Registry lookup failed for $pkg; no placeholder published." >&2
      exit 1
    fi
    cat > "$dir/package/package.json" <<JSON
{
  "name": "$pkg",
  "version": "0.0.1",
  "description": "Placeholder to enable trusted publishing. The real release follows.",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/$REPO.git" },
  "files": ["package.json"],
  "publishConfig": { "access": "public", "registry": "$REGISTRY" }
}
JSON
    (cd "$dir/package" && npm_public publish --access public --tag bootstrap)
  fi
  npm trust github "$pkg" --file "$WORKFLOW" --repo "$REPO" --allow-publish --yes "--registry=$REGISTRY"
done
