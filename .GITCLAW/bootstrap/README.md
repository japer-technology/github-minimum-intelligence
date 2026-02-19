# GitClaw Bootstrap

The `bootstrap/` directory contains the **installable payload** for gitclaw.

Everything in this folder is intentionally flat (no nested subfolders) so it can be copied, vendored, or inspected quickly.

## Files in this folder

- `bootstrap.ts` — one-time installer script.
- `.GITCLAW-AGENT.yml` — GitHub Actions workflow template copied to `.github/workflows/agent.yml`.
- `hatch.md` — issue template copied to `.github/ISSUE_TEMPLATE/hatch.md`.
- `AGENT` — default agent identity/instructions copied to `.GITCLAW/AGENTS.md`.
- `package.json` and `package-lock.json` — runtime dependencies for the scripts under `.GITCLAW/`.

## Bootstrap process (step-by-step)

### 1) Place `.GITCLAW` at your repository root

The expected layout is:

```text
<repo>/
  .GITCLAW/
    bootstrap/
      bootstrap.ts
      .GITCLAW-AGENT.yml
      hatch.md
      AGENT
      package.json
      package-lock.json
    lifecycle/
      main.ts
      preinstall.ts
```

### 2) Run the bootstrap installer

From the repository root:

```bash
bun .GITCLAW/bootstrap/bootstrap.ts
```

The installer is **non-destructive**:

- If a destination file already exists, it skips it.
- If a destination file is missing, it installs it.

### 3) What `bootstrap.ts` installs

The script installs the following resources:

1. `.GITCLAW/bootstrap/.GITCLAW-AGENT.yml` → `.github/workflows/agent.yml`
2. `.GITCLAW/bootstrap/hatch.md` → `.github/ISSUE_TEMPLATE/hatch.md`
3. `.GITCLAW/bootstrap/AGENT` → `.GITCLAW/AGENTS.md`
4. Ensures `.gitattributes` contains:

```text
memory.log merge=union
```

That merge rule keeps the memory log append-only merge behavior safe when multiple branches update it.

### 4) Install dependencies

```bash
cd .GITCLAW/bootstrap
bun install
```

### 5) Configure secrets and push

1. Add `ANTHROPIC_API_KEY` in: **Repository Settings → Secrets and variables → Actions**.
2. Commit the new/installed files.
3. Push to GitHub.

### 6) Start using the agent

Open a GitHub issue. The workflow picks it up and the agent responds in issue comments.

## Why this structure exists

Keeping installable assets in `bootstrap/` provides:

- a single source of truth for what gets installed,
- a predictable payload for distribution,
- easier auditing of installation-time files,
- simpler automation for future installers.
