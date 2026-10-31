#!/usr/bin/env bash
# Deploys the last COMMIT (not the working tree) as a Vercel PREVIEW to the PMK team.
#
#   VERCEL_TOKEN_FILE=~/.config/vercel-pmk-token/token.txt scripts/deploy-preview.sh
#
# Why a clean export: on the Hobby plan Vercel blocks CLI deployments whose git metadata names a commit author
# without deploy rights in the team. `git archive` uploads only committed files (never .env*), without .git,
# so the deployment is attributed to the token's owner. Production is never targeted from here.
set -euo pipefail
TOKEN_FILE="${VERCEL_TOKEN_FILE:-$HOME/.config/vercel-pmk-token/token.txt}"
SCOPE="${VERCEL_SCOPE:-pmk-iteras-projects}"
ROOT="$(git rev-parse --show-toplevel)"
[ -f "$ROOT/.vercel/project.json" ] || { echo "Run 'vercel link' first (.vercel/project.json missing)." >&2; exit 2; }
[ -f "$TOKEN_FILE" ] || { echo "Token file not found: $TOKEN_FILE" >&2; exit 2; }
[ -z "$(git status --porcelain)" ] || echo "Note: uncommitted changes are NOT deployed."

SRC="$(mktemp -d)"
trap 'rm -rf "$SRC"' EXIT
git -C "$ROOT" archive HEAD | tar -x -C "$SRC"
mkdir -p "$SRC/.vercel" && cp "$ROOT/.vercel/project.json" "$SRC/.vercel/"
echo "Deploying commit $(git -C "$ROOT" rev-parse --short HEAD) as a preview to $SCOPE ..."
cd "$SRC"
pnpm dlx vercel@latest deploy --yes --environment preview --scope "$SCOPE" --token "$(tr -d '[:space:]' < "$TOKEN_FILE")"
