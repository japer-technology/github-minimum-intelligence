#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — One-command installer for Minimum Intelligence
#
# Downloads the latest release of .github-minimum-intelligence into the
# current repository and runs the installer to set up workflows and templates.
#
# Usage (from the root of any git repo):
#
#   curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/setup.sh | bash
#
# Or download and run manually:
#
#   wget https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/setup.sh
#   bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="japer-technology/github-minimum-intelligence"
BRANCH="main"
TARGET_DIR=".github-minimum-intelligence"

# ─── Preflight checks ─────────────────────────────────────────────────────────

if ! command -v git &>/dev/null; then
  echo "❌ git is required but not installed." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "❌ Not inside a git repository. Run this from the root of your repo." >&2
  exit 1
fi

if ! command -v bun &>/dev/null; then
  echo "❌ Bun is required but not installed." >&2
  echo "   Install it: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "⚠️  $TARGET_DIR already exists. Remove it first if you want a fresh install." >&2
  exit 1
fi

# ─── Download ──────────────────────────────────────────────────────────────────

echo ""
echo "🧠 Minimum Intelligence Setup"
echo ""
echo "  Downloading from $REPO..."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip" -o "$TMPDIR/repo.zip"
unzip -q "$TMPDIR/repo.zip" -d "$TMPDIR"

# The zip extracts to a directory named <repo>-<branch>/
EXTRACTED=$(ls -d "$TMPDIR"/github-minimum-intelligence-*)

# Copy the .github-minimum-intelligence directory
cp -R "$EXTRACTED/$TARGET_DIR" "$TARGET_DIR"
echo "  Copied $TARGET_DIR/"

# ─── Install ───────────────────────────────────────────────────────────────────

echo ""
bun "$TARGET_DIR/install/MINIMUM-INTELLIGENCE-INSTALLER.ts"
