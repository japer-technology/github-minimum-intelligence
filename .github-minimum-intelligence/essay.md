# The Repo Is the Mind: On pi, LLMs, and Birthing Intelligence Where Code Already Lives

## A Library Called pi

Most developer tools orbit around a familiar gravitational center: you write code in an editor, you run it in a terminal, and somewhere off to the side a chatbot offers suggestions you copy-paste back into your workflow. The loop is functional but fractured - context lives in one place, conversation in another, and the glue between them is you, the human clipboard.

The [pi coding agent](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-coding-agent`) takes a different path. Rather than being a tool you talk *to*, pi is an agent that works *within* - within your files, within your repository, within the environment where your project already breathes. It reads, edits, searches, and commits. It doesn't hand you suggestions through a glass wall; it picks up the tools and builds alongside you.

What makes pi quietly remarkable is its restraint. It is not a platform. It does not require you to sign up for a service, spin up infrastructure, or migrate your workflow to someone else's UI. It is a library - a dependency you install, a process you invoke, an agent that runs where your code runs. That simplicity is the point.

## The Miracle That Made It Possible

None of this works without the large language model underneath. It is easy to become numb to what LLMs actually represent, because we interact with them so casually now - asking for recipe ideas and debugging stack traces in the same afternoon. But step back for a moment and the picture is genuinely extraordinary.

A large language model is a statistical structure trained on a substantial fraction of humanity's written output. It has compressed the syntax of every major programming language, the conventions of every popular framework, the patterns of technical writing, and the rhythms of human conversation into a set of numerical weights. When you give it a prompt, it does not look anything up. It *reconstructs* - generating coherent, contextually appropriate text by traversing a learned landscape of probability.

The practical consequence is that software can now understand instructions written in natural language, reason (however imperfectly) about code, and produce working artifacts. That is the enabling miracle: a general-purpose reasoning engine that speaks every programming language and every human language, available through a single API call.

Pi takes that raw capability and gives it hands. The LLM provides the reasoning; pi provides the agency - the ability to read files, execute searches, make edits, and interact with the operating system. Together they form something more than either piece alone: an agent that can understand what you want and actually do it, right where your work lives.

## The Genius of Birthing AI Inside a Repo

Here is the idea that ties it all together, and it is so simple it almost sounds like a trick: *what if the AI didn't live on a server somewhere, but inside your repository itself?*

That is the core insight behind [Minimum Intelligence](https://github.com/japer-technology/github-minimum-intelligence). You drop a folder into your repo. You open a GitHub Issue. The agent wakes up, reads your message, thinks, responds, and commits its work - all without leaving your repository. GitHub Actions is the runtime. Git is the memory. Issues are the conversation threads. There is no external service, no database, no session cookies. Just the tools every developer already has.

This architecture inverts the normal relationship between developer and AI. In the conventional model, you visit the AI on its home turf - a chat window owned by a company, storing your conversations on their servers, losing context the moment you close the tab. In the repository-native model, the AI visits *you*. Your questions and its answers are committed to git, versioned, searchable, and owned entirely by you. Close the tab, come back in three weeks, comment on the same issue - the agent picks up exactly where it left off, because the conversation history is right there in the commit log.

But the most compelling part is not the memory. It is the *hatching*.

When you first install Minimum Intelligence, you can open a special issue and have a conversation with the agent about who it is going to be. What is its name? What is its personality? Is it formal, casual, snarky, warm? Through a guided dialogue, the agent and its human collaborator co-create an identity - and that identity is written into a Markdown file and committed to the repo. The AI's personality is not configured in some cloud dashboard; it is born through conversation and stored as code.

There is something philosophically elegant about this. The agent's identity is not imposed from the outside; it emerges from a relationship. And because it lives in git, it is versioned - you can see the commit where the agent was named, trace how its personality evolved, even roll back to an earlier version of who it was. Identity as source code. Memory as commit history. Personality as a pull request.

## Why This Matters

The conventional wisdom in AI tooling is to centralize everything. Build a platform. Capture the users. Own the data. The repository-native approach refuses that premise entirely. It says: the developer's repository is already the center of gravity. The code is there. The history is there. The collaboration is there. So that is where the AI should live too.

This matters for practical reasons - data ownership, auditability, offline access, no vendor lock-in. But it also matters for a subtler reason: it treats the developer's environment with respect. It does not ask you to leave your workflow; it joins it. It does not create another silo of context; it enriches the one you already have.

The pi library provides the engine. Large language models provide the intelligence. And the deceptively simple decision to plant all of it inside a git repository - to make the repo the birthplace, the home, and the memory of an AI agent - turns a clever technical integration into something that feels, against all odds, a little bit alive.

---

*The best tools disappear into the work. Pi disappears into the repo. And from inside that repo, something new looks back at you and says: "Hey. I just came online. Who am I?"*
