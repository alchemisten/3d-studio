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
PACKAGES=(
  3d-studio
  3d-studio-ui
  3d-studio-scene-preview
  3d-studio-core
  3d-studio-feature-skybox
  3d-studio-feature-color-switcher
  3d-studio-feature-material-variants
  3d-studio-feature-floor
  3d-studio-feature-wireframe
  3d-studio-feature-camera-rotation
  3d-studio-feature-light-scenarios
  3d-studio-feature-animation
  3d-studio-feature-highlights
)
dry="${1:-}"

npm whoami >/dev/null 2>&1 || npm login

for name in "${PACKAGES[@]}"; do
  pkg="@schablone/$name"
  if npm view "$pkg" version >/dev/null 2>&1; then
    echo "$pkg exists, skipping placeholder publish"
  else
    dir="$(mktemp -d)"
    cat > "$dir/package.json" <<JSON
{
  "name": "$pkg",
  "version": "0.0.1",
  "description": "Placeholder to enable trusted publishing. The real release follows.",
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/$REPO.git" },
  "publishConfig": { "access": "public" }
}
JSON
    (cd "$dir" && npm publish --access public --tag bootstrap ${dry:+--dry-run})
    rm -rf "$dir"
  fi
  [ -n "$dry" ] || npm trust github "$pkg" --file "$WORKFLOW" --repo "$REPO" --allow-publish --yes
done
