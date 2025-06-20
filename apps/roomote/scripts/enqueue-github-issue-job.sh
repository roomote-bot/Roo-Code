#!/bin/bash

REPO="RooCodeInc/Roo-Code"
ISSUE_NUMBER="$1"
BASE_URL="http://localhost:3001"
JOBS_ENDPOINT="$BASE_URL/api/jobs"

if [ -z "$ISSUE_NUMBER" ]; then
    echo "Usage: $0 <issue_number> [repo]"
    echo ""
    echo "Examples:"
    echo "  $0 4567           # Fetch issue #4567 from RooCodeInc/Roo-Code"
    echo "  $0 123 owner/repo # Fetch issue #123 from owner/repo"
    echo ""
    echo "This script fetches real GitHub issue data and enqueues it as a job."
    exit 1
fi

if [ -n "$2" ]; then
    REPO="$2"
fi

if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first."
    echo "Visit: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI. Please run 'gh auth login' first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it first."
    echo "Visit: https://jqlang.github.io/jq/download/"
    exit 1
fi

echo "Fetching issue #${ISSUE_NUMBER} from ${REPO}..."

ISSUE_DATA=$(gh issue view ${ISSUE_NUMBER} --repo ${REPO} --json title,body,labels 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch issue #${ISSUE_NUMBER} from ${REPO}"
    echo "Please check that the issue exists and you have access to the repository."
    exit 1
fi

TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')
BODY=$(echo "$ISSUE_DATA" | jq -r '.body // ""')
LABELS=$(echo "$ISSUE_DATA" | jq -r '[.labels[].name] | @json')

JSON_PAYLOAD=$(jq -n \
  --arg type "github.issue.fix" \
  --arg repo "$REPO" \
  --argjson issue "$ISSUE_NUMBER" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --argjson labels "$LABELS" \
  '{
    type: $type,
    payload: {
      repo: $repo,
      issue: $issue,
      title: $title,
      body: $body,
      labels: $labels
    }
  }')

echo "curl -X POST \"$JOBS_ENDPOINT\" -H \"Content-Type: application/json\" -d \"$JSON_PAYLOAD\" -w \"\nStatus: %{http_code}\n\n\""

curl -X POST "$JOBS_ENDPOINT" -H "Content-Type: application/json" -d "$JSON_PAYLOAD" -w "\nStatus: %{http_code}\n\n"
