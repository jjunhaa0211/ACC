#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-}"
if [[ -z "${REPO}" ]]; then
  echo "Usage: $0 <owner/repo>"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

echo "Applying branch protection to ${REPO}..."

cat > /tmp/acc-branch-protection.json <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Web CI",
      "AI PR Review",
      "AI Review Policy",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

if gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/main/protection" \
  --input /tmp/acc-branch-protection.json >/dev/null; then
  echo "Branch protection updated."
else
  echo "Failed to update branch protection."
  echo "Check repository admin permissions and token scope (repo/admin:repo_hook)."
  exit 1
fi

echo "Applying merge queue ruleset..."
cat > /tmp/acc-merge-queue-ruleset.json <<'JSON'
{
  "name": "Main Merge Queue Rules",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "merge_queue",
      "parameters": {
        "check_response_timeout_minutes": 30,
        "grouping_strategy": "ALLGREEN",
        "max_entries_to_build": 5,
        "max_entries_to_merge": 1,
        "min_entries_to_merge": 1,
        "min_entries_to_merge_wait_minutes": 0,
        "merge_method": "SQUASH"
      }
    }
  ],
  "bypass_actors": []
}
JSON

ruleset_id="$(
  gh api "repos/${REPO}/rulesets" --jq '.[] | select(.name == "Main Merge Queue Rules") | .id' 2>/dev/null \
    | head -n 1
)"

if [[ -n "${ruleset_id}" ]]; then
  if gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/${REPO}/rulesets/${ruleset_id}" \
    --input /tmp/acc-merge-queue-ruleset.json >/dev/null 2>&1; then
    echo "Merge queue ruleset updated (id=${ruleset_id})."
  else
    echo "Merge queue ruleset update failed."
    echo "Open repository settings and verify Merge Queue/rulesets permissions."
  fi
else
  if gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "repos/${REPO}/rulesets" \
    --input /tmp/acc-merge-queue-ruleset.json >/dev/null 2>&1; then
    echo "Merge queue ruleset created."
  else
    echo "Merge queue ruleset create failed."
    echo "Open repository settings and verify Merge Queue/rulesets permissions."
  fi
fi

echo "Governance apply script completed."
