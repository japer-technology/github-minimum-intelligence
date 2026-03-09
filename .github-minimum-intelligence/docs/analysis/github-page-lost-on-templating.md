# Analysis: GitHub Pages settings are lost when using a template repository

## Short answer
This is expected behavior.

When you create a repo from a **template**, GitHub copies repository **content** (files, optionally branches), but not most repository-level **settings**. GitHub Pages configuration is a repository setting, so it does not carry over.

---

## What exactly is not preserved
Typically not transferred from template to new repo:
- Pages source/build mode (branch vs GitHub Actions)
- Selected branch/folder for Pages
- Custom domain binding in settings
- Environment/repo settings related to Pages

What *can* be preserved if committed as files:
- `.github/workflows/...` workflows
- `CNAME` file in repo root (for custom domain)
- Static site content/build scripts

---

## What you can do

## 1) Prefer GitHub Actions-based Pages deployment in the template
Put a Pages deploy workflow in the template so every derived repo already has deployment logic.

Example file: `.github/workflows/pages.yml`

```yaml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      # add your build step(s) here
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Why this helps:
- The deployment mechanism lives in versioned code.
- New repos from template are immediately close to deploy-ready.

Caveat:
- Some org/repo policies still require a one-time enablement/approval for Pages.

---

## 2) Automate post-template setup (best for teams)
After creating a repo from template, run an automation step to configure Pages via API/CLI.

Using GitHub CLI (conceptual):
```bash
gh api -X POST /repos/{owner}/{repo}/pages \
  -f build_type=workflow
```

If Pages already exists, use PATCH endpoint variants as needed.

Good patterns:
- A bootstrap script run by maintainers
- An org-level provisioning workflow
- Internal developer portal that creates repos + applies settings

---

## 3) If using a custom domain
- Commit a `CNAME` file in the repo (copied via template).
- Still verify DNS and HTTPS status in repo settings after creation.

---

## 4) Provide a checklist for template consumers
Add a short `TEMPLATE_SETUP.md` with a “2-minute post-create” checklist:
1. Enable Pages / set source to GitHub Actions.
2. Run initial workflow.
3. Verify site URL.
4. (Optional) set custom domain.

This reduces support overhead when full automation is not possible.

---

## Recommendation
For reliability and repeatability:
1. Store Pages deployment as workflow code in template.
2. Add lightweight repo-provisioning automation (CLI/API) to enable Pages immediately after repo creation.
3. Keep `CNAME` (if needed) in source control.

That combination gives near “template includes Pages config” behavior, even though GitHub does not natively clone repo settings from templates.
