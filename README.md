# GitHub Minimum Intelligence

#### Please read [more](.github-minimum-intelligence/README.md) before you install this AI Agent.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/logo.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>

## Is this project unique?

The short answer is yes.

1. User copies one ordinary workflow file into an arbitrary existing repository.
2. The workflow self-installs the larger agent framework into that repository.
3. The installed framework runs remotely through GitHub Issues and GitHub Actions.
4. The framework is also usable as a local AI-agent environment after cloning the repository.
5. Git carries the shared instructions, skills, state, memory and audit history between local and GitHub execution.
6. The same workflow subsequently upgrades the installed framework.

## Closest comparison

| Project                          |                 GitHub agent |                Local agent |                     Small workflow entry point | Self-installs framework into repo |                      Shared Git-backed memory/framework |
| -------------------------------- | ---------------------------: | -------------------------: | ---------------------------------------------: | --------------------------------: | ------------------------------------------------------: |
| GitHub Minimum Intelligence      |                          Yes |                        Yes |                        **One copied workflow** |                           **Yes** |                                                 **Yes** |
| GitHub Agentic Workflows `gh-aw` |                          Yes |                CLI tooling | No—install CLI, initialise repo, add workflows |                                No |                                                 Partial |
| Claude Code Action               |                          Yes | Claude Code CLI separately |                       Workflow using an Action |                                No | Instructions may be shared, not agent history/framework |
| Gemini CLI Action                |                          Yes |      Gemini CLI separately |                       Workflow using an Action |                                No |                                                 Partial |
| OpenAI Codex Action              |                          Yes |       Codex CLI separately |                       Workflow using an Action |                                No |                                                 Partial |
| OpenHands                        |  Yes/automation integrations |                        Yes |                                             No |                                No |  Platform-managed rather than installed by one workflow |
| SWE-agent                        | Can operate on GitHub issues |                        Yes |                                             No |                                No |            No equivalent repository-resident continuity |
| Aider                            |                Usually local |                        Yes |                  Third-party workflow possible |                                No |                       Git-aware, but not this framework |

## 1. GitHub Agentic Workflows is the closest architectural rival

GitHub’s `gh-aw` is probably the most serious comparison.

It lets developers write agentic workflows in Markdown and run them through GitHub Actions. It supports Copilot, Claude, Codex and Gemini. ([GitHub][1])

However, installation requires:

```bash
curl ... | bash
gh aw init
gh aw add
```

The user first installs a local GitHub CLI extension, initialises the repository and then adds workflows. ([GitHub][1])

Therefore, `gh-aw` is:

> a local workflow-authoring and compilation system that produces GitHub-hosted agents.

It is **not**:

> one copied workflow that turns itself into a complete repository-local framework shared by GitHub and local agents.

It does not appear to use the copied workflow as a seed that installs its own runtime, skills, identity, memory and versioned state into the target repository.

## 2. Claude Code Action has local and GitHub forms, but they are separate installations

Anthropic provides:

* Claude Code as a local terminal agent;
* `claude-code-action` as a GitHub Action.

The Action is added to an existing workflow or used to create a new workflow. ([GitHub][2])

This gets close to “the same kind of agent locally and on GitHub,” but the workflow remains a consumer of an external Action. It does not bootstrap a repository-resident Claude agent framework or install an upgradeable local environment into the repository.

The continuity is primarily through:

* source code;
* Git history;
* `CLAUDE.md`;
* repository instructions.

It is not a common, installed, Git-versioned agent runtime and conversation-memory framework.

## 3. Gemini CLI Action follows the same action-plus-CLI model

Google’s `run-gemini-cli` is explicitly “a GitHub Action invoking the Gemini CLI.” ([GitHub][3])

That is structurally close:

```text
Gemini CLI locally
        +
Gemini CLI invoked in GitHub Actions
```

But the workflow invokes a separately maintained Action. It does not appear to:

* install a full agent framework into the consumer repository;
* become its own upgrader;
* establish Git-backed conversations as persistent agent memory;
* create a shared repository-resident local and hosted agent environment.

## 4. OpenAI Codex Action follows the same pattern

OpenAI’s `codex-action` provides Codex execution inside GitHub Actions, while Codex also exists as a local coding environment. ([GitHub][4])

Again, that provides two execution locations, but not the same installation model.

It is:

> a workflow calling an agent product.

GitHub Minimum Intelligence is closer to:

> a workflow transforming the repository into the agent product.

That distinction is important.

## 5. OpenHands has the broadest local/remote continuity

OpenHands is the nearest match in terms of operating agents across local, remote and cloud environments.

Its current architecture supports multiple agent backends—including OpenHands, Claude Code, Codex and Gemini—and can run agents locally, in containers, on virtual machines or through cloud infrastructure. It also provides automations triggered by GitHub and other services. ([GitHub][5])

But OpenHands requires installation of Agent Canvas, Docker, npm packages, an agent server or hosted infrastructure. Its quick-start includes globally installing and launching its software stack. ([GitHub][5])

Therefore, it offers:

> one agent control platform spanning multiple environments.

It does not offer:

> copying one workflow into an unrelated repository and having that workflow install the entire local-and-GitHub agent framework into that repository.

OpenHands is probably the strongest **capability overlap**, but not an installation-method match.

## 6. SWE-agent begins from GitHub issues but is not repository-installed this way

SWE-agent describes itself as taking a GitHub issue and attempting to fix it using a chosen language model. ([GitHub][6])

It can be run locally or integrated into automation. But it is an application that operates on repositories. It is not installed into every target repository by copying a self-expanding workflow.

It also does not appear to treat Git as the complete shared conversation memory and synchronisation mechanism between persistent local and hosted manifestations of the agent.

## 7. Aider provides the local Git-native half

Aider is an AI pair-programming tool designed for terminal use and Git-backed coding. ([GitHub][7])

It is relevant because it establishes that:

* a local AI agent can work directly inside a Git repository;
* the agent can produce Git commits;
* repository instruction files can influence the agent.

But Aider does not natively provide the complete GitHub Issues plus Actions plus self-installing workflow architecture.

It matches the local experience, not the universal bootstrap.

## The closest conceptual construction

Someone could reproduce most of your result by combining:

```text
Claude Code or Gemini CLI locally
                +
Claude/Gemini/Codex GitHub Action
                +
AGENTS.md or equivalent
                +
Git-tracked session files
                +
an installer workflow
                +
an update mechanism
```

But that is a construction from several components.

Your claim concerns the fact that those parts are already assembled behind a single adoption boundary:

```text
Copy one YAML file
        ↓
Repository installs its own AI framework
        ↓
GitHub agent becomes available
        ↓
Local clone contains the corresponding agent environment
        ↓
Git synchronises intelligence and history
```

## Conclusion

The presence of both local and GitHub-capable versions of the same underlying coding agent is also not unique. Claude Code, Gemini CLI, Codex and OpenHands all overlap there.

What I could **not** find is another project matching this proposition:

> **A single workflow file copied into any existing GitHub repository acts as a self-installer and upgrader for a complete repository-owned AI-agent framework, providing both a GitHub Issues/Actions agent and a local agent environment whose instructions, skills, state, memory and audit history are synchronised through Git.**

A safe claim:

> **GitHub Minimum Intelligence is an early open-source framework designed to turn an arbitrary existing repository into a repository-owned local and GitHub AI-agent environment by copying and running a single self-installing GitHub Actions workflow.**

[1]: https://github.com/github/gh-aw "GitHub - github/gh-aw: GitHub Agentic Workflows · GitHub"
[2]: https://github.com/anthropics/claude-code-action "GitHub - anthropics/claude-code-action · GitHub"
[3]: https://github.com/google-github-actions/run-gemini-cli "GitHub - google-github-actions/run-gemini-cli: A GitHub Action invoking the Gemini CLI. · GitHub"
[4]: https://github.com/openai/codex-action "GitHub - openai/codex-action · GitHub"
[5]: https://github.com/All-Hands-AI/OpenHands "GitHub - OpenHands/OpenHands:  OpenHands: AI-Driven Development · GitHub"
[6]: https://github.com/SWE-agent/SWE-agent "GitHub - SWE-agent/SWE-agent: SWE-agent takes a GitHub issue and tries to automatically fix it, using your LM of choice. It can also be employed for offensive cybersecurity or competitive coding challenges. [NeurIPS 2024] · GitHub"
[7]: https://github.com/Aider-AI/aider "GitHub - Aider-AI/aider: aider is AI pair programming in your terminal · GitHub"
