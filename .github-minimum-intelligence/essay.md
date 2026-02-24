# The Repo Is the Mind

### On pi, LLMs, and Birthing Intelligence Where Code Already Lives

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/github-minimum-intelligence/main/.github-minimum-intelligence/logo.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>

## A Library Called pi

Most developer tools orbit around a familiar gravitational center: you write code in an editor, execute it in a terminal, and somewhere off to the side, a chatbot offers suggestions that you copy and paste back into your workflow. The loop is functional but fractured. Context lives in one place, conversation in another, and the glue binding them together is you—the human clipboard.

The [pi coding agent](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-coding-agent`) takes a fundamentally different path. Rather than being a tool you talk *to*, pi is an agent that works *within*—within your files, within your repository, within the environment where your project already breathes. It reads, edits, searches, and commits. It doesn’t hand you suggestions through a glass wall; it picks up the tools and builds alongside you.

What makes pi quietly remarkable is its restraint. It is not a platform. It does not require you to sign up for a service, spin up infrastructure, or migrate your workflow into a proprietary UI. It is simply a library—a dependency you install, a process you invoke, and an agent that runs exactly where your code runs. That simplicity is the point.

## The Engine Beneath the Agency

None of this works without the underlying large language model. It is easy to become numb to what LLMs actually represent, simply because we interact with them so casually now—asking for recipe ideas and debugging stack traces in the same afternoon. But step back for a moment, and the reality is genuinely extraordinary.

An LLM is a statistical structure trained on a substantial fraction of humanity's written output. It has compressed the syntax of every major programming language, the conventions of every popular framework, the patterns of technical writing, and the rhythms of human conversation into a vast matrix of numerical weights. When you give it a prompt, it isn't looking anything up. It *reconstructs*—generating coherent, contextually appropriate text by traversing a learned landscape of probability.

The practical consequence is that software can now understand instructions written in natural language, reason (however imperfectly) about code, and produce working artifacts. That is the enabling catalyst: a general-purpose reasoning engine that speaks every programming and human language, available through a single API call.

Pi takes that raw capability and gives it hands. While the LLM provides the reasoning, pi provides the agency—the ability to read files, execute searches, make edits, and interact with the operating system. Together, they form something greater than the sum of their parts: an agent that understands your intent and executes it, right where your work lives.

## The Genius of Birthing AI Inside a Repo

Here is the idea that ties it all together, and it is so elegant it almost sounds like a trick: *what if the AI didn't live on a server somewhere, but inside your repository itself?*

That is the core insight driving [Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence). You drop a folder into your repository. You open a GitHub Issue. The agent wakes up, reads your message, thinks, responds, and commits its work—all without ever leaving the repo. GitHub Actions serves as the runtime. Git acts as the memory. Issues become the conversation threads. There is no external service, no database, no session cookies. Just the tools every developer already relies on.

This architecture inverts the normal relationship between developer and AI. In the conventional model, you visit the AI on its home turf—a chat window owned by a corporation, storing your conversations on their servers, instantly losing context the moment you close the tab. In the repository-native model, the AI visits *you*. Your questions and its answers are committed to git, versioned, searchable, and owned entirely by you. Close the tab, come back in three weeks, and comment on the same issue; the agent picks up exactly where it left off, because the conversation history is embedded in the commit log.

But the most compelling part isn't the memory. It is the *hatching*.

When you first install Minimum Intelligence, you open a specific issue to have a conversation with the agent about who it is going to be. What is its name? What is its personality? Is it formal, casual, snarky, or warm? Through a guided dialogue, the agent and its human collaborator co-create an identity—and that identity is written into a Markdown file and committed to the repository. The AI's personality isn't configured in a sterile cloud dashboard; it is born through conversation and stored as code.

There is a profound philosophical elegance to this. The agent's identity is not imposed from the outside; it emerges from a relationship. And because it lives in git, it is versioned. You can view the commit where the agent was named, trace how its personality evolved, or even roll back to an earlier iteration of who it was. Identity as source code. Memory as commit history. Personality as a pull request.

## Why This Matters

The conventional wisdom in AI tooling is to centralize everything: build a platform, capture the users, own the data. The repository-native approach refuses that premise entirely. It argues that the developer's repository is already the center of gravity. The code is there. The history is there. The collaboration is there. Therefore, that is where the AI should live too.

This matters for highly practical reasons—data ownership, auditability, offline access, and the absence of vendor lock-in. But it also matters for a subtler, more vital reason: it treats the developer's environment with respect. It doesn't ask you to abandon your workflow; it joins it. It doesn't create another silo of context; it enriches the one you already have.

The pi library provides the engine. Large language models provide the intelligence. And the deceptively simple decision to plant all of it inside a git repository—to make the repo the birthplace, the home, and the memory of an AI agent—turns a clever technical integration into something that feels, against all odds, a little bit alive.

---

*The best tools disappear into the work. Pi disappears into the repo. And from inside that repo, something new looks back at you and says: "Hey. I just came online. Who am I?"*
