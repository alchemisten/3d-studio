#!/usr/bin/env bash
# Usage: tools/scripts/scaffold-lib.sh <dir-name> <nx-project-name> <description>
# Copies the build/test config of libs/core into libs/<dir-name>.
set -euo pipefail
dir="$1"; project="$2"; desc="$3"
dest="libs/$dir"
mkdir -p "$dest/src"
for f in project.json tsconfig.json tsconfig.lib.json tsconfig.spec.json .eslintrc.json vite.config.ts package.json; do
  sed -e "s#libs/core#libs/$dir#g; s#3d-studio-core#$project#g; s#dist/libs/core#dist/libs/$dir#g; s#vite/core#vite/$dir#; s#name: 'core'#name: '$dir'#" "libs/core/$f" > "$dest/$f"
done
sed -i "s#\"description\": \"[^\"]*\"#\"description\": \"$desc\"#" "$dest/package.json"
sed -i "s#\"name\": \"@schablone/$project\"#\"name\": \"@schablone/$project\"#; s#\"@schablone/$project\": \"__root_version__\",#\"@schablone/3d-studio-core\": \"__root_version__\",#" "$dest/package.json"
sed -i "s#        '@schablone/3d-studio-ui',#        '@schablone/3d-studio-ui',\n        '@schablone/3d-studio-core',#" "$dest/vite.config.ts"
sed -i "s#    \"@schablone/3d-studio-ui\": \"__root_version__\",#    \"@schablone/3d-studio-core\": \"__root_version__\",\n    \"@schablone/3d-studio-ui\": \"__root_version__\",#" "$dest/package.json"
python3 - "$dest/package.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
d['exports'].pop('./style.css',None); d.pop('sideEffects',None)
json.dump(d,open(p,'w'),indent=2); open(p,'a').write('\n')
PY
