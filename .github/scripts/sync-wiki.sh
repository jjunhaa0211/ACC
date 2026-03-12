#!/usr/bin/env bash
set -euo pipefail

OWNER_REPO="${1:-jjunhaa0211/ACC}"
WIKI_REMOTE="https://github.com/${OWNER_REPO}.wiki.git"

if ! git ls-remote "${WIKI_REMOTE}" >/dev/null 2>&1; then
  echo "[wiki-sync] Wiki remote is not available yet: ${WIKI_REMOTE}"
  echo "[wiki-sync] Enable Wiki in repository settings and create the first wiki page once via GitHub UI."
  exit 2
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

git clone "${WIKI_REMOTE}" "${tmp_dir}/wiki"

cp wiki/*.md "${tmp_dir}/wiki/"

pushd "${tmp_dir}/wiki" >/dev/null
if [ -z "$(git status --porcelain)" ]; then
  echo "[wiki-sync] No wiki changes"
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add .
git commit -m "docs: sync acc-ci wiki pages"
git push origin HEAD
popd >/dev/null

echo "[wiki-sync] Completed"
