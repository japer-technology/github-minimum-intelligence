#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — One-command installer/upgrader for GitHub Minimum Intelligence
#
# Downloads the latest release of .github-minimum-intelligence into the
# current repository and runs the installer to set up workflows and templates.
# If already installed, upgrades framework files while preserving user
# customisations (AGENTS.md, settings.json, state/).
#
# Usage (from the root of any git repo):
#
#   # Fresh install
#   curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
#
#   # Upgrade an existing installation
#   curl -fsSL https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh | bash
#
# Or download and run manually:
#
#   wget https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/script/setup.sh
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

# ─── Detect install vs upgrade ────────────────────────────────────────────────

UPGRADE="false"
if [ -d "$TARGET_DIR" ]; then
  UPGRADE="true"
  INSTALLED_VERSION="unknown"
  if [ -f "$TARGET_DIR/VERSION" ]; then
    INSTALLED_VERSION=$(cat "$TARGET_DIR/VERSION" | tr -d '[:space:]')
  fi
fi

# ─── Download ──────────────────────────────────────────────────────────────────

echo ""
if [ "$UPGRADE" = "true" ]; then
  echo "🔄 GitHub Minimum Intelligence Upgrade"
  echo ""
  echo "  Installed version: $INSTALLED_VERSION"
else
  echo "🧠 GitHub Minimum Intelligence Setup"
fi
echo ""
echo "  Downloading from $REPO..."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip" -o "$TMPDIR/repo.zip"
unzip -q "$TMPDIR/repo.zip" -d "$TMPDIR"

# The zip extracts to a directory named <repo>-<branch>/
EXTRACTED=$(ls -d "$TMPDIR"/github-minimum-intelligence-*)

INCOMING_VERSION="unknown"
if [ -f "$EXTRACTED/$TARGET_DIR/VERSION" ]; then
  INCOMING_VERSION=$(cat "$EXTRACTED/$TARGET_DIR/VERSION" | tr -d '[:space:]')
fi

if [ "$UPGRADE" = "true" ]; then
  echo "  Incoming version:  $INCOMING_VERSION"

  if [ "$INSTALLED_VERSION" = "$INCOMING_VERSION" ]; then
    echo ""
    echo "✅ Already up to date (version $INSTALLED_VERSION)."
    echo ""
    exit 0
  fi
fi

# ─── Install or Upgrade ───────────────────────────────────────────────────────

if [ "$UPGRADE" = "true" ]; then
  # Preserve user-customised files by backing them up
  BACKUP="$TMPDIR/backup"
  mkdir -p "$BACKUP"

  echo ""
  echo "  Preserving user customisations..."

  # Back up files that the user may have customised
  [ -f "$TARGET_DIR/AGENTS.md" ]         && cp "$TARGET_DIR/AGENTS.md" "$BACKUP/AGENTS.md"
  [ -f "$TARGET_DIR/.pi/settings.json" ] && cp "$TARGET_DIR/.pi/settings.json" "$BACKUP/settings.json"
  [ -d "$TARGET_DIR/state" ]             && cp -R "$TARGET_DIR/state" "$BACKUP/state"

  # Back up any extra .pi files the user may have added or modified
  [ -d "$TARGET_DIR/.pi" ] && cp -R "$TARGET_DIR/.pi" "$BACKUP/.pi"

  # Replace the framework directory with the new version
  rm -rf "$TARGET_DIR"
  cp -R "$EXTRACTED/$TARGET_DIR" "$TARGET_DIR"

  # Remove the source repo's state — it should not be carried over
  rm -rf "$TARGET_DIR/state"

  # Restore backed-up user files
  [ -f "$BACKUP/AGENTS.md" ]    && cp "$BACKUP/AGENTS.md" "$TARGET_DIR/AGENTS.md"
  [ -d "$BACKUP/state" ]        && cp -R "$BACKUP/state" "$TARGET_DIR/state"

  # Restore the entire .pi directory (preserves user skills, APPEND_SYSTEM.md, etc.)
  if [ -d "$BACKUP/.pi" ]; then
    cp -R "$BACKUP/.pi/." "$TARGET_DIR/.pi/"
  fi

  echo "  Upgraded $TARGET_DIR/"
else
  # Fresh install
  cp -R "$EXTRACTED/$TARGET_DIR" "$TARGET_DIR"

  # Remove the state folder — it contains runtime state from the master repo
  # and should not be carried over into a fresh installation.
  rm -rf "$TARGET_DIR/state"

  # Reset repo-specific files to their default templates so new installations
  # do not inherit the source repo's agent identity or model configuration.
  cp "$TARGET_DIR/install/MINIMUM-INTELLIGENCE-AGENTS.md" "$TARGET_DIR/AGENTS.md"
  cp "$TARGET_DIR/install/settings.json" "$TARGET_DIR/.pi/settings.json"

  echo "  Copied $TARGET_DIR/"
fi

# ─── Run installer ─────────────────────────────────────────────────────────────

echo ""
if [ "$UPGRADE" = "true" ]; then
  bun "$TARGET_DIR/install/MINIMUM-INTELLIGENCE-INSTALLER.ts" --upgrade
else
  bun "$TARGET_DIR/install/MINIMUM-INTELLIGENCE-INSTALLER.ts"
fi
