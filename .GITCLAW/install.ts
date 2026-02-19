import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
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

function ensureAttribute(filePath: string, attributeRule: string) {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${attributeRule}\n`, "utf-8");
    console.log(`  ✅ .gitattributes created with: ${attributeRule}`);
    return;
  }

  const currentContent = readFileSync(filePath, "utf-8");
  const lines = currentContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.includes(attributeRule)) {
    console.log(`  ⏭  .gitattributes already contains: ${attributeRule}`);
    return;
  }

  const separator = currentContent.endsWith("\n") || currentContent.length === 0 ? "" : "\n";
  writeFileSync(filePath, `${currentContent}${separator}${attributeRule}\n`, "utf-8");
  console.log(`  ✅ Added to .gitattributes: ${attributeRule}`);
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

console.log("\nIssue templates:");
ensureDir(resolve(repoRoot, ".github", "ISSUE_TEMPLATE"));
copyIfMissing(
  resolve(gitclawDir, "issue-templates", "hatch.md"),
  resolve(repoRoot, ".github", "ISSUE_TEMPLATE", "hatch.md"),
  ".github/ISSUE_TEMPLATE/hatch.md"
);

console.log("\nGit attributes:");
ensureAttribute(resolve(repoRoot, ".gitattributes"), "memory.log merge=union");

console.log("\n✨ gitclaw installed!\n");
console.log("Next steps:");
console.log("  1. Add ANTHROPIC_API_KEY to Settings → Secrets and variables → Actions");
console.log("  2. Run: cd .GITCLAW && bun install");
console.log("  3. Commit and push the changes");
console.log("  4. Open an issue to start chatting with the agent\n");
