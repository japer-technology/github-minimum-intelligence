# Implementation: Pi Skills — Web Search (brave-search)

This document details the implementation plan for installing the `brave-search` skill from [pi-skills](https://github.com/badlogic/pi-skills) to give the GMI agent web research capability, as identified in the [implementation plan](implementation-plan.md).

---

## 1. Current State

The agent has no web search capability. When asked questions requiring current information (recent releases, CVE details, API documentation changes, news), the agent either:

- Declines, stating it cannot access the internet
- Provides potentially outdated information from its training data
- Suggests the user search manually

Pi supports installing third-party skill packages that extend the agent's capabilities. The [pi-skills](https://github.com/badlogic/pi-skills) repository provides a `brave-search` skill that enables web search and content extraction via the Brave Search API.

---

## 2. Available Skills from pi-skills

| Skill | Description | Applicability to GMI |
|---|---|---|
| `brave-search` | Web search and content extraction | **High** — enables current information lookup |
| `youtube-transcript` | Fetch YouTube video transcripts | Medium — useful for tutorial/demo references |
| `browser-tools` | Interactive browser automation via CDP | Low — headless CI environment, requires Chrome |
| `transcribe` | Speech-to-text via Groq Whisper | Low — no audio input in GitHub Issues |
| `gccli` / `gdcli` / `gmcli` | Google Calendar/Drive/Gmail CLIs | None — not relevant to code repository agent |
| `vscode` | VS Code integration | None — no VS Code in GitHub Actions |

**Primary recommendation:** Install `brave-search` only. Other skills are either irrelevant to the GitHub Actions environment or require additional infrastructure.

**Secondary recommendation:** Consider `youtube-transcript` as a future addition if the agent needs to reference video content.

---

## 3. brave-search Skill Details

### 3.1 How It Works

The brave-search skill provides instructions to the LLM for using a Node.js script that:

1. Accepts a search query
2. Calls the Brave Search API
3. Returns structured results (title, URL, snippet)
4. Optionally fetches and extracts content from result pages

### 3.2 Requirements

- **Node.js** — Available in GitHub Actions runners
- **`BRAVE_API_KEY`** — API key from [brave.com/search/api](https://brave.com/search/api/)
- **`npm install`** — Dependencies must be installed in the skill directory

### 3.3 API Key Pricing

Brave Search API offers:

- **Free tier:** 2,000 queries/month (sufficient for most GMI workloads)
- **Paid tiers:** Starting at $3/month for 20,000 queries

For a repository-level agent that responds to issues, the free tier is likely sufficient.

---

## 4. Installation Options

### Option A: Project-Local Git Clone (Recommended)

Clone the pi-skills repository into `.pi/skills/` and commit it:

```bash
cd .github-minimum-intelligence
git clone https://github.com/badlogic/pi-skills .pi/skills/pi-skills
cd .pi/skills/pi-skills/brave-search
npm install
```

**Directory structure after installation:**

```
.pi/
├── skills/
│   ├── memory/
│   │   └── SKILL.md
│   ├── skill-creator/
│   │   └── ...
│   └── pi-skills/
│       └── brave-search/
│           ├── SKILL.md
│           ├── package.json
│           ├── node_modules/
│           └── scripts/
│               └── search.js
```

**Pros:**
- Fully committed to repository — aligns with "GitHub as Infrastructure" principle
- No external dependency at runtime
- Version-controlled; updates are explicit git operations

**Cons:**
- Adds third-party code to the repository
- `node_modules/` within the skill directory adds to repo size
- Must manually update when pi-skills publishes changes

### Option B: Pi Package Install via settings.json

Configure pi-skills as a package in `.pi/settings.json`:

```json
{
  "packages": [
    {
      "source": "pi-skills",
      "skills": ["brave-search"]
    }
  ]
}
```

This uses pi's built-in package manager to install from npm or git. With the `-l` flag, packages install to `.pi/git/` or `.pi/npm/` (project-local).

**Pros:**
- Clean separation between project code and packages
- Pi handles updates via `pi update`
- Selective skill loading (only `brave-search`, not all skills)

**Cons:**
- Requires `pi install` or `pi update` during CI setup
- Additional step in the workflow setup
- Package state may not be committed to git (depending on `.gitignore`)

### Option C: Settings-Based Package Reference

Add pi-skills as a package reference in `.pi/settings.json` and let pi auto-install:

```json
{
  "packages": ["pi-skills"]
}
```

**Pros:** Simplest configuration.
**Cons:** Installs all skills (including irrelevant ones like gccli, vscode); requires network access at runtime.

**Recommendation:** **Option A** for maximum alignment with the "GitHub as Infrastructure" principle. All code, skills, and dependencies live in the committed repository. Option B is the fallback if repository size is a concern.

---

## 5. Implementation Steps

### Step 1: Obtain Brave Search API Key

1. Create an account at [brave.com/search/api](https://brave.com/search/api/)
2. Generate an API key
3. Add as a GitHub repository secret: `BRAVE_API_KEY`

### Step 2: Add Secret to Workflow

Update `.github/workflows/github-minimum-intelligence-agent.yml` to pass the key:

```diff
 env:
   ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
+  BRAVE_API_KEY: ${{ secrets.BRAVE_API_KEY }}
```

### Step 3: Install the Skill

Clone and install the brave-search skill:

```bash
cd .github-minimum-intelligence
git clone https://github.com/badlogic/pi-skills /tmp/pi-skills
cp -r /tmp/pi-skills/brave-search .pi/skills/brave-search
cd .pi/skills/brave-search
npm install
```

### Step 4: Update `.gitignore`

Ensure the skill's `node_modules/` is committed (it's required at runtime in the CI environment):

```
# Do NOT add .pi/skills/brave-search/node_modules/ to .gitignore
# The skill needs its dependencies available at runtime
```

Alternatively, add the `npm install` step to the workflow to install at runtime (avoids committing `node_modules/`):

```yaml
- name: Install brave-search dependencies
  run: |
    cd .github-minimum-intelligence/.pi/skills/brave-search
    npm install
```

### Step 5: Verify Skill Discovery

Pi auto-discovers skills in `.pi/skills/`. No settings.json change is needed for project-local skills. Verify by checking the agent's startup output for skill loading messages.

### Step 6: Test Web Search

Create a test issue asking a question that requires current information:

> What are the latest features added to pi-coding-agent in the most recent release?

The agent should use the brave-search skill to find and summarise current information.

---

## 6. Security Considerations

| Concern | Assessment | Mitigation |
|---|---|---|
| API key exposure | The `BRAVE_API_KEY` is passed as an environment variable | Use GitHub encrypted secrets; never log the key |
| Search result injection | Brave Search results could contain malicious content | The LLM processes results as context, not executable code |
| Third-party code in repo | brave-search skill includes Node.js scripts | Review skill source code before committing; pin to a specific commit |
| Network access from CI | The brave-search skill makes HTTP requests to Brave API | Brave Search API is a well-known service; rate-limited by API key |

---

## 7. Cost Estimation

| Usage Pattern | Monthly Queries | Cost |
|---|---|---|
| Light (5–10 issues/week, 20% need search) | ~8–16 | Free tier |
| Moderate (20–30 issues/week, 30% need search) | ~24–36 | Free tier |
| Heavy (50+ issues/week, 50% need search) | ~100+ | Free tier (up to 2,000/month) |

The free tier is sufficient for all expected GMI usage patterns.

---

## 8. Rollback Plan

1. Delete `.pi/skills/brave-search/` directory
2. Remove `BRAVE_API_KEY` from workflow environment variables
3. Remove `BRAVE_API_KEY` from GitHub repository secrets
4. Commit and push

No agent.ts changes are required — pi automatically adjusts to available skills.

---

## 9. Summary

Installing the `brave-search` skill from pi-skills gives the GMI agent web research capability with minimal effort. The skill uses pi's existing project-local skill discovery mechanism, requires only a free Brave Search API key, and aligns with the "GitHub as Infrastructure" principle when committed to the repository. The free API tier supports up to 2,000 queries/month, well within expected usage.

*Estimated effort: 1 hour (including API key setup and testing). Risk: Low.*
