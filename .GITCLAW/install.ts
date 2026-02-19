import { existsSync, mkdirSync, cpSync } from "fs";
import { resolve } from "path";

const gitclawDir = import.meta.dir;
const repoRoot = resolve(gitclawDir, "..");

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function copyIfMissing(src: string, dest: string, label: string) {
  if (existsSync(dest)) {
    console.log(`  ⏭  ${label} already exists, skipping`);
  } else {
    cpSync(src, dest, { recursive: true });
    console.log(`  ✅ ${label} installed`);
  }
}

console.log("🔧 Installing gitclaw into this repository...\n");

// Install workflow
console.log("Workflows:");
ensureDir(resolve(repoRoot, ".github", "workflows"));
copyIfMissing(
  resolve(gitclawDir, "workflows", "agent.yml"),
  resolve(repoRoot, ".github", "workflows", "agent.yml"),
  ".github/workflows/agent.yml"
);

console.log("\n✨ gitclaw installed!\n");
console.log("Next steps:");
console.log("  1. Add ANTHROPIC_API_KEY to Settings → Secrets and variables → Actions");
console.log("  2. Run: cd .GITCLAW && bun install");
console.log("  3. Commit and push the changes");
console.log("  4. Open an issue to start chatting with the agent\n");
