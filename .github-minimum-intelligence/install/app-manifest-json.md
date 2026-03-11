# app-manifest.json

The `app-manifest.json` file is a GitHub App manifest — a declarative JSON document that describes everything GitHub needs to register a new GitHub App on your behalf. Instead of filling out dozens of form fields in the GitHub UI, you submit this single file and GitHub creates the App with the correct name, permissions, events, and URLs already configured.

This file lives at `.github-minimum-intelligence/install/app-manifest.json` and is only used during [Method 3: GitHub App](../../README.md#method-3-github-app) installation. The quick-start script and manual-copy methods do not use it.

---

## 1. Full Contents

```json
{
  "name": "github-minimum-intelligence",
  "description": "An AI agent that lives in your GitHub repository — responds to issues, remembers conversations, and commits its work.",
  "url": "https://github.com/japer-technology/github-minimum-intelligence",
  "public": true,
  "hook_attributes": {
    "url": "https://example.com/webhook",
    "active": false
  },
  "setup_url": "https://github.com/japer-technology/github-minimum-intelligence#quick-start-after-installing-the-github-app",
  "setup_on_update": true,
  "default_permissions": {
    "issues": "write",
    "contents": "write",
    "actions": "write",
    "metadata": "read"
  },
  "default_events": [
    "issues",
    "issue_comment",
    "installation",
    "installation_repositories"
  ]
}
```

---

## 2. Field-by-Field Reference

### 2.1 Identity Fields

| Field | Value | Purpose |
|---|---|---|
| `name` | `"github-minimum-intelligence"` | Display name shown in GitHub's App directory and on bot comments. GitHub requires this to be unique across all Apps on the instance. Maximum 34 characters. |
| `description` | *(see manifest)* | One-line description shown on the App's public page. |
| `url` | `"https://github.com/japer-technology/github-minimum-intelligence"` | Homepage URL for the App. Points back to this repository so installers can find documentation. |
| `public` | `true` | Makes the App installable by any GitHub user or organisation, not only the account that registered it. Set to `false` if you want a private App restricted to your own account. |

### 2.2 Webhook Configuration

| Field | Value | Purpose |
|---|---|---|
| `hook_attributes.url` | `"https://example.com/webhook"` | Placeholder URL. This project runs entirely on GitHub Actions, so no external webhook endpoint is needed. GitHub requires the field to be present; the placeholder satisfies that requirement. |
| `hook_attributes.active` | `false` | Disables webhook delivery. Since the agent is triggered by GitHub Actions workflow events (not incoming HTTP webhooks), keeping this `false` avoids unnecessary failed delivery attempts. |

### 2.3 Setup Redirect

| Field | Value | Purpose |
|---|---|---|
| `setup_url` | `"https://github.com/japer-technology/github-minimum-intelligence#quick-start-after-installing-the-github-app"` | After a user installs the App on a repository, GitHub redirects them to this URL. It points to the quick-start section of the README so the installer knows what to do next. |
| `setup_on_update` | `true` | Also redirect to the setup URL when the App is updated (not just on first install). Useful for showing upgrade instructions. |

### 2.4 Permissions

| Permission | Level | Why it is needed |
|---|---|---|
| `issues` | `write` | Post comments on issues, add emoji reactions (🚀 while processing, 👍 on success), and read issue content for conversation context. |
| `contents` | `write` | Commit files to the repository — conversation logs, memory state, code changes the agent produces, and any files it edits during a session. |
| `actions` | `write` | Manage workflow runs. Required for the agent workflow to operate and for the installation workflow to log activity. |
| `metadata` | `read` | Read basic repository metadata (name, description, topics, visibility). GitHub requires this permission for all Apps; it cannot be omitted. |

These four permissions match exactly what the agent workflow (`github-minimum-intelligence-agent.yml`) declares in its `permissions:` block.

### 2.5 Event Subscriptions

| Event | Trigger | Which workflow handles it |
|---|---|---|
| `issues` | An issue is opened. | `github-minimum-intelligence-agent.yml` — starts the agent to read and respond. |
| `issue_comment` | A comment is added to an issue. | `github-minimum-intelligence-agent.yml` — continues the conversation. |
| `installation` | The App is installed on a user or organisation account. | `github-minimum-intelligence-installation.yml` — logs the installation. |
| `installation_repositories` | Repositories are added to an existing App installation. | `github-minimum-intelligence-installation.yml` — creates a welcome issue in each new repo. |

---

## 3. How to Use It

### 3.1 Register via the GitHub UI

1. Go to **GitHub → Settings → Developer settings → GitHub Apps**.
2. Click **New GitHub App**.
3. Scroll to the bottom of the form and click **"Register a GitHub App from a manifest"**.
4. Paste the full contents of `app-manifest.json` into the text field and submit.
5. GitHub creates the App and shows you the **App ID** and a **private key** (`.pem` file) to download.

### 3.2 Register via the API

```bash
curl -X POST https://github.com/settings/apps/new \
  -H "Accept: application/json" \
  -d @.github-minimum-intelligence/install/app-manifest.json
```

This opens a browser confirmation page. After you confirm, GitHub returns the App credentials.

### 3.3 Store Credentials

In the repository where the agent runs, go to **Settings → Secrets and variables → Actions** and add two secrets:

| Secret | Value |
|---|---|
| `APP_ID` | The numeric App ID from the App's settings page |
| `APP_PRIVATE_KEY` | The full contents of the downloaded `.pem` private key file |

### 3.4 Install the App on Repositories

From the App's settings page, click **Install App** and select which repositories should receive the agent. Each repository still needs:

1. The `.github-minimum-intelligence/` folder (run the [quick setup script](../../README.md#method-1-quick-setup-script) or copy manually).
2. An LLM API key stored as a repository secret (e.g. `OPENAI_API_KEY`).

When the App is installed on a new repository, the `github-minimum-intelligence-installation` workflow automatically creates a welcome issue with setup instructions.

---

## 4. Customising the Manifest

You can edit `app-manifest.json` before registering the App. Common changes:

| Change | What to edit |
|---|---|
| **Rename the App** | Change `"name"` to your preferred name (max 34 characters, must be unique on GitHub). |
| **Make the App private** | Set `"public": false`. Only the account that registered the App can install it. |
| **Change the homepage URL** | Update `"url"` to point to your fork or documentation. |
| **Add a webhook endpoint** | Set `hook_attributes.url` to your server's URL and `hook_attributes.active` to `true`. |
| **Add permissions** | Add entries to `default_permissions` (e.g. `"pull_requests": "write"` if you extend the agent to handle PRs). |
| **Add events** | Add entries to `default_events` (e.g. `"pull_request"` to trigger on PR activity). |

After editing, register the App as described in section 3. If the App is already registered, update its settings through the GitHub UI at **Settings → Developer settings → GitHub Apps → [your app] → Edit**.

---

## 5. Relationship to Other Files

| File | Role |
|---|---|
| `app-manifest.json` | Declares what the App needs (permissions, events, identity). Used once during registration. |
| `github-minimum-intelligence-agent.yml` | The workflow that runs the agent. Its `permissions:` block mirrors the manifest's `default_permissions`. |
| `github-minimum-intelligence-installation.yml` | Handles `installation` and `installation_repositories` events declared in the manifest. |
| `MINIMUM-INTELLIGENCE-INSTALLER.ts` | Copies workflows and templates into place. Does not read or modify the manifest. |
| `settings.json` | LLM provider configuration. Independent of the manifest — the manifest controls GitHub permissions; settings.json controls which AI model the agent uses. |

---

## 6. Why the Webhook Is Disabled

Traditional GitHub Apps receive events via HTTP webhooks delivered to an external server. This project has no external server — everything runs inside GitHub Actions. The workflows are triggered directly by GitHub's event system, not by incoming webhooks.

Setting `hook_attributes.active` to `false` tells GitHub not to attempt webhook delivery, which avoids:

- Failed delivery logs piling up in the App's settings.
- The need to provision and maintain a webhook endpoint.
- Security surface area from exposing an HTTP endpoint.

If you later add a server component that needs real-time event delivery, set `active` to `true` and replace the placeholder URL with your endpoint.

---

## 7. Summary

The `app-manifest.json` is a one-time registration document. It tells GitHub exactly what permissions and events the Minimum Intelligence agent requires, and GitHub creates a properly configured App from it. The four permissions (`issues`, `contents`, `actions`, `metadata`) and four event subscriptions (`issues`, `issue_comment`, `installation`, `installation_repositories`) match the two workflows that power the agent. After registration, the manifest is not read again — changes to the running App are made through the GitHub App settings UI.
