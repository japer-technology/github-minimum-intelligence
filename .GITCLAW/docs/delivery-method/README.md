# .GITCLAW 🦞 Delivery Methods

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/gitclaw/main/.GITCLAW/GITCLAW-LOGO.png" alt="GitClaw" width="500">
  </picture>
</p>

This folder documents every viable delivery method for getting the `.GITCLAW/` folder into a repository. Each document is a deep-dive into a specific approach — how it works, its architecture, strengths, limitations, and when to use it.

## Why Delivery Methods Matter

gitclaw is a self-contained `.GITCLAW/` folder that turns any GitHub repo into an AI-powered assistant. The delivery question is: **how does that folder get into a repo in the first place?**

These documents map out every channel — from what exists today to ideas that could reshape how gitclaw is distributed.

## Documentation Map

| Document | Description |
|----------|-------------|
| [fork-import-installer.md](fork-import-installer.md) | The current method — manual fork or import plus the installer script |
| [github-application.md](github-application.md) | A registered GitHub App that installs gitclaw with a single click |
| [github-marketplace-action.md](github-marketplace-action.md) | A published GitHub Action that bootstraps gitclaw from any workflow |
| [github-template-repository.md](github-template-repository.md) | Mark the gitclaw repo as a template for instant new-repo creation |
| [cli-tool.md](cli-tool.md) | A single `npx gitclaw init` command to install locally |
| [github-pages-self-service-portal.md](github-pages-self-service-portal.md) | A GitHub Pages site that generates and delivers configurations |
| [third-party-website.md](third-party-website.md) | A dedicated website serving as a full-featured installation hub |
| [email-based-delivery.md](email-based-delivery.md) | Email-based delivery via attachments, magic links, or invitations |
| [github-repository-dispatch.md](github-repository-dispatch.md) | API-driven installation via GitHub repository dispatch events |
| [browser-extension.md](browser-extension.md) | A browser extension that adds an install button to GitHub repo pages |
| [git-submodule-subtree.md](git-submodule-subtree.md) | Include gitclaw as a git submodule or subtree |
| [package-registry.md](package-registry.md) | Publish `.GITCLAW/` as a versioned npm or GitHub Package |
| [github-codespaces-dev-container.md](github-codespaces-dev-container.md) | Pre-configure gitclaw in a dev container definition |
| [probot-webhook-service.md](probot-webhook-service.md) | A hosted webhook service that responds to GitHub events |

## See Also

- [GITCLAW-Delivery-Methods.md](../GITCLAW-Delivery-Methods.md) — Overview and comparison matrix of all delivery methods in a single document.

---

> 🦞 *gitclaw is the folder. The delivery method is just the door.*
