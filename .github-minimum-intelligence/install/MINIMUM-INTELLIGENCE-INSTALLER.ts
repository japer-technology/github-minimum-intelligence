/**
 * MINIMUM-INTELLIGENCE-INSTALLER.ts — Setup/upgrade script for Minimum Intelligence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE
 * ─────────────────────────────────────────────────────────────────────────────
 * Copies the GitHub Actions workflow and issue templates from the
 * `.github-minimum-intelligence/install/` directory into the correct
 * locations under `.github/` so that the agent is ready to run.
 *
 * Supports both fresh installation and upgrades of an existing installation.
 *
 * Run once after adding the `.github-minimum-intelligence/` folder to a repo:
 *
 *   bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts
 *
 * To upgrade an existing installation:
 *
 *   bun .github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts --upgrade
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Creates `.github/workflows/` and `.github/ISSUE_TEMPLATE/` if missing.
 *   2. Copies the agent workflow template into `.github/workflows/`.
 *   3. Copies the hatch and chat issue templates into `.github/ISSUE_TEMPLATE/`.
 *   4. Initialises the `AGENTS.md` identity file if one does not exist.
 *   5. Initialises `.pi/settings.json` with default provider config if not customised.
 *   6. Installs runtime dependencies via `bun install`.
 *
 * In upgrade mode (--upgrade):
 *   - Workflow files are always overwritten to pick up fixes.
 *   - Issue templates are always overwritten.
 *   - AGENTS.md and .pi/settings.json are preserved (not overwritten).
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { resolve, basename } from "path";

// ─── Flags ────────────────────────────────────────────────────────────────────
const isUpgrade = process.argv.includes("--upgrade");

// ─── Paths ────────────────────────────────────────────────────────────────────
// `import.meta.dir` resolves to `.github-minimum-intelligence/install/`.
const installDir = import.meta.dir;
const minimumIntelligenceDir = resolve(installDir, "..");
const repoRoot = resolve(minimumIntelligenceDir, "..");

const workflowsDir = resolve(repoRoot, ".github", "workflows");
const issueTemplateDir = resolve(repoRoot, ".github", "ISSUE_TEMPLATE");

// Source templates inside install/
const workflowSrc = resolve(installDir, "github-minimum-intelligence-agent.yml");
const hatchSrc = resolve(installDir, "github-minimum-intelligence-hatch.md");
const chatSrc = resolve(installDir, "github-minimum-intelligence-chat.md");
const agentsSrc = resolve(installDir, "MINIMUM-INTELLIGENCE-AGENTS.md");
const settingsSrc = resolve(installDir, "settings.json");

// Destination paths
const workflowDest = resolve(workflowsDir, "github-minimum-intelligence-agent.yml");
const hatchDest = resolve(issueTemplateDir, "github-minimum-intelligence-hatch.md");
const chatDest = resolve(issueTemplateDir, "github-minimum-intelligence-chat.md");
const agentsDest = resolve(minimumIntelligenceDir, "AGENTS.md");
const settingsDest = resolve(minimumIntelligenceDir, ".pi", "settings.json");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  created ${dir.replace(repoRoot + "/", "")}/`);
  }
}

function copyTemplate(src: string, dest: string, overwrite = false): void {
  const relSrc = src.replace(repoRoot + "/", "");
  const relDest = dest.replace(repoRoot + "/", "");
  const alreadyExists = existsSync(dest);
  if (alreadyExists && !overwrite) {
    console.log(`  skip    ${relDest} (already exists)`);
    return;
  }
  copyFileSync(src, dest);
  const verb = alreadyExists ? "update" : "copy";
  console.log(`  ${verb.padEnd(8)} ${relSrc} → ${relDest}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (isUpgrade) {
  const versionFile = resolve(minimumIntelligenceDir, "VERSION");
  const version = existsSync(versionFile)
    ? readFileSync(versionFile, "utf-8").trim()
    : "unknown";
  console.log(`\n🔄 Minimum Intelligence Upgrade (→ ${version})\n`);
} else {
  console.log("\n🧠 Minimum Intelligence Installer\n");
}

// 1. Create target directories
ensureDir(workflowsDir);
ensureDir(issueTemplateDir);

// 2. Copy workflow template (always overwrite on upgrade to pick up fixes)
copyTemplate(workflowSrc, workflowDest, isUpgrade);

// 3. Copy issue templates (always overwrite on upgrade)
copyTemplate(hatchSrc, hatchDest, isUpgrade);
copyTemplate(chatSrc, chatDest, isUpgrade);

// 4. Initialise AGENTS.md if it does not already contain an identity
if (existsSync(agentsDest)) {
  const existing = readFileSync(agentsDest, "utf-8");
  if (existing.includes("## Identity")) {
    console.log(`  skip    AGENTS.md (identity already configured)`);
  } else {
    console.log(`  keep    AGENTS.md (exists but no identity yet — use 🥚 Hatch to create one)`);
  }
} else {
  copyTemplate(agentsSrc, agentsDest);
}

// 5. Initialise .pi/settings.json with defaults if not already customised
// On upgrade, preserve existing settings
copyTemplate(settingsSrc, settingsDest);

// 6. Install runtime dependencies
console.log("\n  Installing dependencies...\n");
const install = Bun.spawnSync(["bun", "install"], {
  cwd: minimumIntelligenceDir,
  stdout: "inherit",
  stderr: "inherit",
});
if (install.exitCode !== 0) {
  console.error("\n❌ bun install failed. Check the output above.\n");
  process.exit(1);
}

if (isUpgrade) {
  console.log("\n✅ Minimum Intelligence has been upgraded.\n");
  console.log("Next steps:");
  console.log("  1. Review the changes:");
  console.log("       git diff");
  console.log("  2. Commit and push:");
  console.log("       git add -A && git commit -m 'Upgrade minimum-intelligence' && git push\n");
} else {
  console.log("\n✅ Minimum Intelligence is installed.\n");
  console.log("Next steps:");
  console.log("  1. Add your LLM API key as a GitHub repository secret");
  console.log("     (e.g. OPENAI_API_KEY — see README.md for all providers)");
  console.log("  2. Commit and push:");
  console.log("       git add -A && git commit -m 'Add minimum-intelligence' && git push");
  console.log("  3. Open an issue in your repo to start chatting with the agent\n");
}
