# GitHub as Infrastructure

## An essay on the architecture, philosophy, and operational meaning of this repository

This repository is not merely a project about an AI agent. It is a project about a relocation of infrastructure. Its most important claim is not that a model can answer questions in GitHub, or that a workflow can comment on an issue, or even that an agent can edit files and commit code. Those capabilities are now familiar enough that, taken one by one, they no longer feel especially radical. The deeper claim is that the place developers already inhabit—the repository, the issue tracker, the workflow runner, the commit graph—can serve as a complete substrate for intelligence-bearing software. In that sense, this repo is less a feature demo than an argument. It is an architectural thesis expressed as code, docs, shell scripts, workflow YAML, and institutional self-critique.

The repository says this explicitly in its README: GitHub can function as compute, Git as storage, GitHub secrets as credential store, and Issues as UI. That formulation is memorable because it collapses categories that are usually separated. We have been trained to think of infrastructure as clouds, clusters, queues, databases, observability stacks, hosting panels, identity systems, and vendor dashboards. Here, by contrast, infrastructure is assembled from everyday collaboration primitives already present in most software teams. The repo does not ask the user to adopt a new platform; it asks the user to notice that their existing platform is already more capable than they have been using it for.

That shift in perspective matters. Most AI tooling to date has treated the repository as an external object: something to index, upload, summarize, or mirror into a proprietary application. This repository reverses that direction. Instead of exporting the repo into an AI platform, it imports the AI into the repo. Instead of moving work into a chat product, it makes the issue tracker itself the conversation surface. Instead of storing memory in opaque vendor sessions, it stores the conversation in Git-tracked files. Instead of adding a control plane, it packages a runtime. Instead of inventing new ceremony, it exploits old habits. The result is a system that feels at once unusual and obvious, because it builds a new category out of parts developers already trust.

To understand why this is compelling, it is necessary to read this repo in at least three ways at once. First, it is a practical automation kit. There is a `setup.sh` installer, a `.github-minimum-intelligence/` directory, workflow templates, issue templates, a Bun-based runtime, and a small TypeScript orchestrator at `.github-minimum-intelligence/lifecycle/agent.ts`. Second, it is a philosophy of software operations. The docs repeatedly return to concepts like sovereignty, auditability, versioned memory, and the idea that “the repo is the mind.” Third, it is a governance object. The project contains not just implementation details but warnings, threat models, incident response plans, operational readiness levels, and a capabilities analysis of what this sort of system can do when placed inside a GitHub Actions runner. Most AI projects advertise power and hide risk. This one tries, with unusual directness, to document both.

That combination is what makes the repo significant. It is not only trying to make an agent useful. It is trying to redefine what counts as enough infrastructure for an agent. In the conventional worldview, AI systems require dashboards, brokers, databases, managed orchestration, prompt stores, vector indexes, long-lived application servers, and a dedicated vendor relationship. In the worldview represented here, a repository can absorb many of those responsibilities by leaning on properties it already possesses: authenticated events, durable history, file storage, collaboration surfaces, branching semantics, permissions, workflows, and portable configuration. The claim is not that GitHub is the perfect infrastructure. The claim is that for a large class of developer-facing intelligence workflows, GitHub is already sufficient infrastructure.

This essay argues that this repository is best understood as an example of “infrastructural inversion.” It exposes GitHub not as a website where code happens to be hosted, but as a programmable environment with latent systems properties. It treats Git not as a source archive, but as a persistence layer. It treats Issues not as tickets, but as an interaction protocol. It treats Markdown not as documentation, but as governance, personality, and capability packaging. It treats Actions not as CI alone, but as a general-purpose runtime. And it treats the repository boundary not as a place where work ends, but as the place where AI collaboration should begin.

The rest of the essay will examine how this repo makes that argument. It will move from the project’s high-level thesis into its concrete implementation, then into its institutional implications. Along the way, it will show that the most interesting thing about this codebase is not only the agent it runs, but the redefinition of where software intelligence is allowed to live.

## 1. The repository as product, not payload

The first thing this repo does well is establish that the product is not a web service. The product is a folder. That is a deceptively strong design move.

The README describes “GitHub Minimum Intelligence” as a repository-local AI framework that plugs into a developer’s existing workflow. Installed by adding a single `.github-minimum-intelligence` folder, it uses GitHub Issues for conversation, Git for persistent versioned memory, and GitHub Actions for execution. That summary is concise, but it has far-reaching implications. A folder is portable. A folder is copyable. A folder can be vendored, forked, diffed, code-reviewed, pinned, or deleted. A folder does not create a second canonical system beside the repo. It becomes part of the repo.

This distinction between product-as-folder and product-as-platform is one of the core insights of the project. Traditional SaaS AI products ask the user to enter a new operational universe. They want authentication, billing, organizational seats, admin settings, hosted memory, hosted prompt templates, custom indexing, and usually an SDK or browser UI. Even when such products integrate with GitHub, the center of gravity remains elsewhere. The repo becomes data supplied to an external product.

Here, the center of gravity stays inside the tree. The repo is not payload sent to a service. The repo is the service environment. The folder contains the runtime dependencies, identity files, installer, workflow templates, issue templates, state directory, and lifecycle logic. The package relationship is visible in `.github-minimum-intelligence/package.json`, which pins the core runtime to `@mariozechner/pi-coding-agent` version `0.65.1`. This matters because it frames the agent as a dependency, not a tenancy. A dependency can be audited and controlled with ordinary software supply-chain practices. A tenancy cannot.

The project’s own architectural document, `the-repo-is-the-mind.md`, emphasizes this in direct language: `@mariozechner/pi-coding-agent` is an npm package; Minimum Intelligence is a repo-local configuration layer; there is no hosted backend and no new trust boundary beyond what the workflow grants. The vendor relationship becomes legible in the same terms as any other package in the stack. If the upstream disappears, the pinned version still works. If behavior changes undesirably, the user can fork. This is not just nice for developers; it is a profound statement about control.

There is a cultural angle to this too. Developers are already comfortable checking in code that shapes their build, their deploys, their tests, their linting, and their release pipelines. They are less comfortable with critical logic that lives in a black box they do not own. By packaging agent behavior inside a repo-local folder, the project aligns AI operations with developer instincts. The source of truth is inspectable. The configuration is text. The workflow is versioned. The result is not simply easier adoption. It is a lower psychological barrier to trust.

The folder model also changes how we think about installation. The `setup.sh` script is not provisioning cloud infrastructure. It performs a download, copies `.github-minimum-intelligence`, deletes carried-over runtime state, resets identity and settings templates, and invokes the Bun installer. The installer at `.github-minimum-intelligence/install/MINIMUM-INTELLIGENCE-INSTALLER.ts` then creates `.github/workflows/` and `.github/ISSUE_TEMPLATE/`, copies the workflow and issue templates, initializes `AGENTS.md` if needed, initializes `.pi/settings.json`, and runs `bun install`. That is not the language of platform onboarding. It is the language of bootstrapping a library.

This is important because the system’s legitimacy depends on it feeling like an extension of normal repository operations rather than a sidecar empire. Once a tool requires its own database, admin portal, hosted state, and integration plane, it begins to compete with the repo for authority. This project avoids that conflict by collapsing the tool into the repo’s own filesystem and event model. The practical effect is minimal ceremony. The philosophical effect is more interesting: intelligence is demoted from platform to package. In software history, that demotion often turns out to be liberation.

## 2. Issues as interface: conversation without leaving the worksite

Most AI systems present themselves through a dedicated interface. The interface then becomes the product. Prompts, memory, tools, user permissions, and collaboration all flow through that external UI. This repo does something almost contrary to product convention: it refuses to build a new front end. Instead, it uses GitHub Issues and issue comments as the primary conversational surface.

At first glance, this sounds like a convenience hack. But it is more than that. Turning issues into chat threads means the agent speaks where the work is already discussed. That collapses a long-standing split between planning, conversation, and execution. Normally, decisions are made in one place, code is changed in another, and AI assistance is sought in a third. Here those spaces converge.

The README presents a simple equivalence: Issue = Conversation. Each GitHub issue maps to a persistent AI conversation, and commenting again continues where the user left off. The workflow file confirms the mechanism. `.github/workflows/github-minimum-intelligence-agent.yml` triggers on `issues` opened and `issue_comment` created. If the event is a new issue, the title and body become the initial prompt. If it is a follow-up comment, the new comment body becomes the prompt for the resumed session. The implementation in `agent.ts` makes this concrete with a small but revealing branch: on `issue_comment`, use `event.comment.body`; otherwise combine title and body.

That design has several infrastructural consequences.

First, it means the interface inherits GitHub’s existing identity and permissions model. The workflow’s Authorize step uses the GitHub CLI to check whether the actor has `admin`, `maintain`, or `write` permission. If not, the job fails. In other words, the same collaborator permissions that regulate who can change code regulate who can instruct the agent. There is no separate ACL service, no shadow identity plane, no new user directory to maintain. The interface is secure only to the extent GitHub is secure, but it is at least secure in the same way the rest of the repo already is.

Second, it means conversation acquires institutional durability. An issue thread is not a transient chat bubble. It is part of the project’s deliberative history. Decisions, clarifications, constraints, and revisions remain attached to the work item that motivated them. This matters because one of the failures of external AI chats is that they often become invisible design documents. Useful reasoning disappears into browser tabs and vendor-controlled history pages. Here, discussion is already in the archive where teammates expect to find it.

Third, using issues as UI subtly changes what counts as “prompting.” A prompt is no longer a special ritual performed in an AI product. It is simply a project communication artifact. The user can file a bug-like issue, ask for an architectural explanation, or request a refactor. The agent enters the same workflow that humans already use to communicate about software. The interface boundary becomes so thin that the system starts to feel less like chat and more like ambient repository behavior.

There is also an ergonomic point worth noticing. By leveraging issue templates, the repo can shape conversational modes without adding application logic. The installer copies templates for chat and for “hatching,” the guided process of giving the agent a personality. This is a clever example of using GitHub-native affordances as higher-level UX components. Templates perform onboarding and steer use patterns without requiring a custom web app. It is humble design, but it is also robust. The tool rides on stable infrastructure instead of having to recreate it.

The deeper point is that GitHub Issues are not being used as a poor substitute for a real UI. They are being used as a domain-appropriate interface. For developer collaboration, issues are already a place where intention is declared, constraints are recorded, and asynchronous work is coordinated. If the agent’s job is to participate in that same workflow, then colocating the conversation there is not a compromise. It is the correct abstraction.

Once that clicks, the repo’s thesis becomes easier to see. Infrastructure is not only servers and state. Infrastructure is also the social surface through which work enters the system. By reusing Issues as the input boundary, the project demonstrates that collaboration software is already computationally significant. What looks like UI is also an event source, a permissions plane, a notification system, and a durable log. In other words, it is infrastructure.

## 3. GitHub Actions as compute: CI as runtime, not just verification

If Issues provide the interface, GitHub Actions provides the machine. This may be the most familiar part of the repo to developers, yet the project uses it in a way that reframes what CI/CD is for.

Actions are usually perceived as build and validation infrastructure. They test, lint, package, release, and deploy. They are procedural automation attached to repository events. This repo keeps that model but expands its meaning. Here, an issue or comment event does not merely trigger status checks. It triggers cognition plus tool execution. A human message becomes the input to a runtime pipeline.

The workflow file is compact enough to study as infrastructure in miniature. It grants `contents: write`, `issues: write`, and `actions: write`. It runs on `ubuntu-latest`. It enforces concurrency per repository and issue number, which is a subtle but important operational detail: conversations on the same issue are serialized so that concurrent agent runs do not trample each other. It avoids self-triggering bot loops by ignoring issue comments whose authors end with `[bot]`. It authorizes the actor, checks out the default branch, sets up Bun, caches dependencies, installs them, and runs the Bun-based orchestrator.

That sequence sounds ordinary, but the repo’s insight is that ordinary is enough. The workflow is not special infrastructure built for AI. It is conventional GitHub automation. Yet by wiring it to an agent runtime, the project turns a CI runner into a general-purpose ephemeral compute node for intelligent work. The runner receives an event, checks policy, downloads dependencies, accesses the repo, executes tools, persists results, and writes back into GitHub. That is a full application lifecycle, only expressed as workflow steps rather than as a long-lived web service.

The `agent.ts` file further clarifies how much infrastructure is already latent in this environment. It reads the full GitHub event payload from `GITHUB_EVENT_PATH`, extracts repository and issue metadata, loads `.pi/settings.json`, validates the configured provider and model, uses the `gh` CLI for API interactions, and invokes the `pi` binary with explicit provider/model/thinking flags. It then captures the agent’s JSONL event stream through `tee`, extracts the assistant’s final text with `tac` and `jq`, maps the issue to a session transcript, commits changes, pushes with retry logic, and posts the final reply back to the issue.

This is a remarkable amount of application behavior for what is, structurally, a single workflow job and one orchestrator script. In a more conventional architecture, each of these responsibilities might be distributed across services: API gateway, worker queue, state store, event bus, credentials manager, scheduler, logging pipeline, and chat backend. In this repo, many of those roles collapse into GitHub’s native capabilities and the runner’s filesystem.

That collapse brings trade-offs, but it also brings clarity. Because the runtime is just a workflow, the operational semantics are understandable. It is event-driven, ephemeral, and transparent. When the job ends, the runner disappears. There is no daemon to keep alive. No webhook server is waiting for the next request. No autoscaling group needs tuning. Compute is allocated on demand in direct response to project activity.

There is also a governance benefit in using CI as runtime. Workflows are already reviewable infrastructure-as-code. Teams already know where to look to see what automation does and which permissions it has. By putting the agent inside that lane, the project avoids a common AI anti-pattern: the creation of an unreviewed hidden control plane. Instead, the agent’s execution contract is right where teams expect dangerous automation to live: `.github/workflows/`.

What this repo ultimately demonstrates is that CI/CD systems are underappreciated as agent runtimes. They already provide secure event initiation, credential injection, environment setup, artifact handling, logs, access to the worktree, and outbound network access. Add a capable tool harness and an LLM client, and CI becomes a programmable intelligence fabric. The agent is not escaping the workflow model. It is exploiting the fact that workflows are already generic compute orchestration.

From that perspective, “GitHub as compute” is not a metaphor. It is a literal description of how the system works. The novel part is not that Actions can run code; everyone knows that. The novel part is that this repo persuades us to see a workflow run as a valid, even elegant, host for AI collaboration.

## 4. Git as memory: turning version control into a persistence layer

If Actions supplies compute, Git supplies memory. This may be the single most important architectural move in the entire project.

Most AI systems talk about memory as though it were a magical property of the model or a premium feature of the product. In practice, memory usually means one of three things: retained conversation history in a vendor service, retrieval over a custom datastore, or opportunistic summarization pushed back into a prompt. All of these approaches are fragile in different ways. They can be truncated, hidden, deleted, silently transformed, or trapped inside somebody else’s application.

This repo instead gives memory a bluntly concrete form: files in the repository. The README lays out the state structure in plain terms:

- `.github-minimum-intelligence/state/issues/<number>.json` maps an issue number to a session path.
- `.github-minimum-intelligence/state/sessions/<timestamp>.jsonl` stores the full conversation transcript.

In `agent.ts`, that design becomes executable. When a new issue arrives, the orchestrator creates directories if needed and checks whether a mapping file exists for the issue number. If it does and the referenced session still exists, the run resumes by passing `--session <path>` to the `pi` agent. If not, it starts fresh. After the run, it identifies the newest session file, writes the mapping file with `issueNumber`, `sessionPath`, and `updatedAt`, stages everything, commits, and pushes.

This is such a simple mechanism that it is easy to miss how powerful it is. The system does not need a database server. It does not need a special memory API. It does not need session affinity or warm application state. A follow-up comment days or weeks later resumes continuity because the transcript is a first-class repository artifact. Memory survives because Git already knows how to preserve artifacts over time.

This creates several advantages at once.

First, memory becomes user-owned. The entire interaction history lives in the repository. A maintainer can inspect it, diff it, restore it, or remove it according to the repo’s own governance. There is no dependence on a vendor’s retention policy or export tools. Data sovereignty, often discussed abstractly in AI circles, becomes materially true because the data literally sits in versioned files under the user’s control.

Second, memory becomes auditable. Every prompt, reply, and code change is linked to a commit history. In conventional AI chat systems, you may know what answer was displayed, but you rarely know exactly what state transition occurred in your project as a result. Here, the transcript and the code changes are recorded in the same source-control universe. That means the “why” and the “what” can be traced together.

Third, memory becomes branchable. This is an underrated point. Because conversation state is in Git, it inherits Git’s weird superpowers. It can be forked, rebased, cherry-picked, reverted, merged, or analyzed. If a team wants to experiment with alternate agent behavior, memory itself can move through the same workflows as code. This collapses the distinction between conversational history and project history.

Fourth, continuity becomes infrastructural rather than rhetorical. The docs are right to emphasize that agent invocations are stateless in process but stateful in history. The runner starts fresh every time. The “mind” is reconstructed from durable artifacts. That is a healthier model for many engineering settings because it resists hidden mutable state. The system’s continuity is not a hidden cache; it is the repo.

There are, of course, tensions. Storing transcript data in Git can bloat repositories over time. Public repositories make conversation history visible. Sensitive material could be accidentally preserved. The repo’s docs acknowledge such concerns, and the security assessment goes further by being candid about the danger of storing and exposing too much. Yet these are not disproofs of the model. They are ordinary storage and governance concerns, now expressed in familiar repository terms rather than hidden in proprietary memory layers.

The phrase “Git as storage” in the README might initially sound slogan-like. But in this codebase it is neither metaphor nor exaggeration. The session files are storage. The issue mappings are indexes. The commit graph is durability. The branch is the active state line. The repo is, in a functional sense, the database. That inversion is one of the essay’s central themes: when a collaboration system already provides persistence, identity, integrity, and history, it can serve as infrastructure with fewer moving parts than custom stacks built to mimic the same guarantees.

## 5. Markdown as governance: personality, policy, and constitution in the tree

One of the most original features of this repo is that it treats Markdown as more than documentation. Markdown is used here as a governance substrate.

Consider `AGENTS.md`. In many AI products, personality is an opaque preset. The end user receives a system prompt they never fully see, lightly decorated by a customizable name and maybe a style toggle. This repo does the opposite. The agent’s identity is a checked-in file. In the current state of this repository, that file declares an identity named Spock, describes its nature as a rational digital entity instantiated within a CI runner, specifies its vibe, emoji, hatch date, and purpose, and even includes instructions on downloading GitHub image attachments.

This is charming, but it is also structurally significant. The persona is not a hidden implementation detail. It is configuration-as-text under version control. That means the agent’s temperament, practical heuristics, and special-case knowledge can be reviewed and revised through normal repository processes. This is not just personalization. It is governance.

The same is true of `.pi/settings.json`, which defines the default provider, model, and thinking level. In this repo, the current defaults are `openai`, `gpt-5.4`, and `high`. The orchestrator explicitly loads those settings and passes them to the runtime so that host-level drift does not silently alter behavior. Again, this is significant. The runtime contract is repo-local, legible, and deterministic in intent. The agent does not inherit its core identity from some invisible machine-global setting. It inherits it from committed configuration.

The docs deepen this constitutional pattern. The repository includes `final-warning.md`, a full security assessment, an incident response plan, operational readiness guidelines, foundational question documents, and the architectural essay `the-repo-is-the-mind.md`. This is not normal project documentation volume for a relatively small runtime. But that excess is meaningful. The repo is trying to establish that if an AI agent is going to live inside the repository, then the repository must also contain the norms and self-understanding that govern it.

This is an important departure from a lot of AI tooling. In many systems, governance is externalized into policy pages, admin toggles, or provider terms of service. The user can maybe configure some limits, but the real constitution is elsewhere. Here the constitution is in the tree. The governing texts are versioned beside the code they regulate. In practical terms, that means a team can diff its governance posture over time just as it diffs code changes. It can ask not only “when did behavior change?” but “when did our stated principles change?”

The “hatching” process reveals another side of this choice. Instead of assuming that identity is a vendor-supplied feature, the repo makes identity an authored artifact created through an issue-driven onboarding dialogue. The installer seeds a template; the project’s workflow invites the team to co-create the agent’s name, personality, and vibe. That sounds whimsical, but it plays a serious role. It turns otherwise hidden instructions into shared social objects. The team participates in defining how the agent should sound and what it should value.

Markdown is also used here to package capabilities and documentation in a way that preserves portability. The docs index lays out security, architecture, questions, and operations. The contributing guide asks would-be contributors to consider how features fit within the architecture of issues as conversation, Git as memory, and Actions as runtime. This means the repo’s philosophy is not separate from its maintenance processes. The documents actively shape how the codebase evolves.

There is a larger lesson here. In AI systems, the most sensitive logic often takes the form of instructions rather than algorithms. If that is true, then instruction files deserve to be treated like code. This repo does exactly that. It stores instruction-bearing documents in the repo, makes them auditable, and places them under the same social review processes as the rest of the project. The result is an unusually legible agent. Not perfectly predictable, because no LLM-backed system is perfectly predictable, but at least unusually inspectable.

From the standpoint of infrastructure, this matters because policy is infrastructure. A system is not adequately defined by what it can execute. It is also defined by how it is told to behave, what failure modes it anticipates, and what norms are embedded in its maintenance surface. By putting those in Markdown inside the repo, this project demonstrates a form of infrastructural localism: the rules live where the work lives.

## 6. Installation as argument: the politics of a one-command setup

There is a reason the README foregrounds the quick-start command. A one-command setup is not just a convenience feature. It is part of the project’s philosophical strategy.

The script `setup.sh` is simple. It checks that `git` and `bun` are installed, confirms the user is inside a Git repository, refuses to overwrite an existing `.github-minimum-intelligence` directory, downloads the source repository as a zip, copies the `.github-minimum-intelligence` folder, deletes the source repo’s `state` directory, resets `AGENTS.md` and `.pi/settings.json` to default templates, and then runs the installer. It is a bootstrapping script, nothing more. Yet its minimalism is itself rhetorical.

The repo wants the user to feel that adding AI capability is akin to adding tooling, not enrolling in infrastructure. The command is run from the root of any repo. It does not ask the user to create an account on a new service. It does not provision a database. It does not require Terraform. It does not even force a dedicated bootstrap application. It behaves like software entering an existing codebase.

This is crucial because modern developer tooling is often burdened by hidden infrastructural ambition. A tool that claims to “just work” may in fact introduce a new trust boundary, new operational dependency, new billing surface, and new failure mode. This repo is explicit that it wants to do the opposite. The setup path preserves the feeling that the repository remains the primary environment. The tool arrives on the repo’s terms.

The installer reinforces this by doing precisely what a repository-native agent should need and no more: create directories, copy workflow and issue templates, initialize identity and settings if absent, and install dependencies. Importantly, it does not treat preexisting identity as disposable. If `AGENTS.md` already contains `## Identity`, the installer skips overwriting it. That is a small touch, but it signals respect for user-defined configuration. Infrastructure that is truly local should not casually erase local state.

There is also an infrastructural elegance in how the setup script removes the source repo’s `state` folder and resets repo-specific files. This acknowledges that portability must be selective. A truly portable agent framework should transfer capability and defaults, but not inherit someone else’s runtime memory or persona. In other words, infrastructure can be copied, but identity and state must be reconstituted. The script encodes that principle directly.

The GitHub App path extends this logic in a slightly different direction. By including an `app-manifest.json`, the repo supports a more centralized installation model for multi-repo deployments. Yet even there, the manifest is declarative and local. It specifies the app name, description, setup URL, default permissions, and events. The repo still frames the GitHub App as an extension of the same repository-centered architecture, not as a replacement for it. The App exists to grant identity and installation scalability, not to relocate control into an external SaaS plane.

What emerges is a coherent politics of installation. The project is not anti-infrastructure; it is anti-unnecessary externalization. It accepts that some things must be configured—API keys, permissions, workflows—but it insists that those configurations should be encoded in plain files and invoked through ordinary developer workflows. There is a humility to that. The system does not present itself as a new universe. It presents itself as a composable inhabitant of the current one.

For teams, this has practical consequences. Lower ceremony means lower experimentation cost. A maintainer can add the folder to a side project, configure a secret, and open an issue. If it fails, the failure is visible in familiar locations. If it succeeds, the functionality feels like a natural extension of the repo. This tight feedback loop is one reason the project’s architectural argument is persuasive. It does not ask the user to believe first and test later. It asks the user to install and observe.

The one-command setup, then, is not merely about onboarding speed. It is an assertion about what modern infrastructure should feel like when it is correctly embedded. It should feel less like procurement and more like cloning a working idea into place.

## 7. The orchestrator as proof: reading `agent.ts` as a systems diagram

The intellectual heart of the repo may be philosophical, but the strongest proof of concept lives in `.github-minimum-intelligence/lifecycle/agent.ts`. It is worth taking this file seriously not just as implementation, but as a systems diagram rendered in TypeScript.

Its top-level commentary tells the story clearly. The file is the main entry point for the agent, receiving a GitHub issue or issue-comment event, running the `pi` AI agent against the prompt, posting the result back as an issue comment, and managing session state so that multi-turn conversations survive across workflow runs. The comments lay out the lifecycle position, the execution pipeline, the session continuity model, push conflict resolution, and GitHub’s comment size limit. This unusually literate style is itself a feature; the code narrates the system it inhabits.

From an infrastructural perspective, several implementation choices are especially revealing.

First, the orchestrator deliberately reads state from the repository and the event payload rather than depending on hidden global state. It resolves directories relative to the repo, parses `GITHUB_EVENT_PATH`, extracts the default branch from the event, and loads `.pi/settings.json`. This reinforces the repo’s commitment to local explicitness. Runtime behavior is determined by checked-in files and the current GitHub event, not by mysterious background services.

Second, it validates configuration aggressively. The code checks that `defaultProvider` and `defaultModel` exist and that the model identifier does not contain whitespace. It constructs a map from provider names to required environment variable names and posts a helpful issue comment if the expected API key is unavailable. This matters because reliability is part of infrastructure. The system is not content to crash mysteriously when configuration is missing; it turns misconfiguration into actionable feedback inside the same issue thread the user is already watching.

Third, the tool uses Unix composition rather than bespoke subsystems. It invokes the `pi` binary, pipes output through `tee` to both the Actions log and `/tmp/agent-raw.jsonl`, then uses `tac` and `jq` to extract the latest assistant message containing text blocks. This is almost refreshingly unspecial. Instead of hiding everything behind custom log processors or service APIs, it uses standard command-line tools. That is not merely expedient. It is philosophically aligned with the repo’s belief that powerful systems can be composed from ordinary infrastructure primitives.

Fourth, the git integration is treated as part of normal system behavior, not as an afterthought. The agent configures the bot identity, stages all changes, commits only if the index is dirty, and pushes back to the default branch. If push conflicts occur, it retries up to ten times with backoff and `git pull --rebase -X theirs`. This is practical engineering: the repo anticipates the reality that multiple automations may race for the same branch. Once again, what we are seeing is a repository-native system embracing repository-native problems rather than pretending they do not exist.

Fifth, the orchestrator preserves the conversational UX inside GitHub. It restores reaction state from the Authorize step, leaves a rocket while work is in progress, and adds either a thumbs-up or thumbs-down reaction when the run completes. This is small-scale product design by way of GitHub affordances. The repo does not need a progress bar because reactions already signal state. Infrastructure inherits user experience from the host platform.

There is a subtle but important line in the code where the orchestrator explicitly passes provider and model from the committed settings file to the runtime “to prevent provider/model drift from host-level config.” That phrase captures the maturity of the design. Once you think of GitHub as infrastructure, you must care about reproducibility in the same way you care about build reproducibility. Agent behavior should be as local and explicit as build tools. The repo understands this.

Reading `agent.ts` end-to-end makes the architecture feel less mystical. There is no hidden magic. The system fetches input, restores or creates session state, invokes a tool-enabled agent, extracts output, persists the session mapping, commits changes, pushes them, and comments back. The achievement is not complexity. It is the demonstration that this loop is enough.

That is why the file matters so much for the repo’s larger thesis. The essay “GitHub as Infrastructure” is not vindicated by slogans in the README alone. It is vindicated by the fact that the entire orchestration can fit into one script without collapsing under conceptual contradictions. The script is the proof that the repo’s architectural inversion is operationally coherent.

## 8. Security honesty: infrastructure means power, and power means blast radius

A large part of what makes this repository credible is that it does not romanticize its own architecture. If GitHub is infrastructure, then an agent inside GitHub inherits both the power and the danger of that infrastructure. The project’s security documents are striking precisely because they are unusually unsparing about this fact.

The files `security-assessment.md` and `warning-blast-radius.md` do not read like marketing collateral. They read like internal red-team memos written by a system that knows it could become dangerous. They describe org-wide repository access, unrestricted network egress, passwordless sudo on the runner, plaintext API keys in environment variables, absence of branch protection, lack of code review gating, Docker availability, self-replication via workflow injection, and the open-ended power of unrestricted bash execution. They also map threat actors, attack surfaces, STRIDE categories, and concrete attack scenarios.

This is not peripheral. It is central to the repo’s meaning. The project’s thesis about GitHub as infrastructure cuts both ways. If GitHub provides compute, storage, UI, identity, and deployment-adjacent authority, then placing an agent there is not a toy operation. It means giving the agent access to real organizational power. The docs understand that and insist on saying it plainly.

This honesty is important because one of the recurring pathologies in AI tooling is security exceptionalism. Vendors often imply that AI assistance is somehow conceptually separate from ordinary automation risk. In reality, once an LLM can call tools inside a CI runner with repository write permissions, it should be evaluated like any other privileged automation—arguably more skeptically, because its behavior is partially stochastic and its instruction surface may be exposed to prompt injection.

The repo does not solve all of those risks. In some cases, it explicitly cannot, especially when using standard GitHub-hosted runners. But it does something arguably more valuable: it situates the conversation correctly. The problem is not “AI is scary in the abstract.” The problem is “this workflow has these permissions, this network access, these secrets, and this capacity to mutate code and workflows.” That is an infrastructural framing. It turns fear into engineering.

The governance documents push this further by proposing operational readiness levels that constrain agent behavior. These levels range from full suspension of operations to read-only advisory modes to standard operations. Whether or not a team adopts those exact levels, the framework is instructive. It suggests that agent capability should be dynamically governable, much like systems posture in traditional security operations.

This is another place where the repository-native model shines. Because the workflow, the docs, the settings, and the identity files all live in the repo, the hardening story can also live in the repo. Branch protection, CODEOWNERS, workflow restrictions, permission scopes, and command constraints are not external legal promises. They are implementable controls attached to the same tree.

There is also a fascinating contradiction inside the docs: the repository both celebrates “zero infrastructure” and proves that zero additional infrastructure can still amount to very consequential infrastructure. In truth, the phrase means “no separate infrastructure beyond GitHub and the repo,” not “no infrastructure at all.” The security docs reveal just how much infrastructure GitHub already is. The runner has root. The token has reach. The workflow can mutate code. The platform is powerful because it is infrastructure, not despite it.

That tension is productive. It prevents the project from lapsing into naïve minimalism. The system is minimal in moving parts, not minimal in authority. Anyone evaluating this repo seriously should come away with both admiration for its elegance and respect for its blast radius. That dual awareness is, in a sense, the responsible endpoint of the project’s thesis. If GitHub is infrastructure, then repository-native AI deserves the same rigor we apply to any infrastructure that can build, mutate, and distribute software.

## 9. The repo as institution: docs, warnings, and the shaping of operator behavior

There is another dimension to this repository that is easy to underrate: it is trying to form operator judgment, not just operator capability.

Many engineering tools stop at documentation sufficient to install and use them. This project goes well beyond that. The docs index organizes material into core documentation, safety and governance, security, readiness levels, foundational questions, architecture, and configuration. There are documents for “What?”, “Who?”, “When?”, “Where?”, “How?”, and “How Much?” There is a major architectural essay titled “The Repo Is the Mind.” There is a final warning document and a full incident response plan.

This pattern suggests that the maintainers understand the project not as a narrow utility but as a socio-technical intervention. If a repo is going to become the habitat of an agent, then the humans interacting with that repo need more than setup instructions. They need conceptual models. They need caution. They need a vocabulary for what the system is and what it is not.

The contributing guide makes this explicit by asking feature suggestions to explain how they fit within the architecture of issues as conversation, Git as memory, and Actions as runtime, and to review the capabilities analysis to understand the access model. In other words, architectural alignment and security awareness are part of the contribution bar. That is healthy. It means the repo is not only shipping code; it is curating a discipline around that code.

This institutional role is significant because infrastructure is never only technical. It is also educational. A system’s docs teach its operators where to place trust, how to think about failure, and what norms govern acceptable use. In traditional platform companies, that educational function is often hidden behind onboarding flows and customer success narratives. Here it is rendered in Markdown files any contributor can inspect.

One can even interpret the question documents as a form of design accountability. They force the project to answer: what is this thing? who acts? when does memory exist? where does intelligence live? how does the loop function? how much intelligence can a repository hold? These are not only philosophical exercises. They are prompts that help stabilize the project’s self-concept. A repository-native agent is still an unusual category. The docs help prevent it from degenerating into vague branding.

There is also a subtle interplay between the docs and the code. The architecture docs say the repository is the mind; the state directory and session mapping code make that true. The docs say identity is checked-in config; `AGENTS.md` and the installer make that true. The docs say GitHub is compute, Git is memory, and Issues are UI; the workflow and orchestrator make that true. The docs say the system has significant blast radius; the security assessment demonstrates that empirically. This mutual reinforcement creates a rare condition in software projects: the conceptual story and the implementation story are tightly coupled.

That coupling matters because many AI products suffer from conceptual drift. Their docs describe an idealized model of behavior while the operational reality is hidden elsewhere. This repo instead invites the reader to triangulate between the docs and the code. In doing so, it turns the repository into a kind of living white paper. The arguments are not merely written; they are executed.

If GitHub is infrastructure, then the repository is also an institution. It carries norms, memory, social roles, and procedural rules. This project embraces that and makes the institutional layer part of the system design. In a sense, the repo is not only hosting an agent. It is teaching people how to host agents responsibly.

## 10. Zero additional infrastructure does not mean zero architecture

One of the cleverest rhetorical moves in the README is the phrase “zero external infrastructure.” It is accurate in the narrow sense that the system requires no dedicated servers or platform beyond the repository, the Actions runner, and an LLM API key. But there is a risk in reading this as simplicity without architecture. In truth, the repo is deeply architectural; it just concentrates its architecture into already existing layers.

This distinction matters because “minimal infrastructure” can mean either underdesigned or well-composed. In this project, it is clearly the latter. The architecture emerges from composition:

- GitHub event payloads provide input envelopes.
- Issue numbers provide stable conversation keys.
- Session JSONL files provide durable transcript storage.
- Mapping JSON files provide pointer indirection.
- GitHub Actions provides execution and credential injection.
- The `gh` CLI provides API integration.
- Bun provides runtime and dependency management.
- `pi` provides tool orchestration.
- Git provides persistence, synchronization, and reversibility.
- Markdown provides governance and identity.

None of those components is exotic, but together they form a legitimate application architecture. In some ways, the elegance of the system comes from the fact that each component is allowed to do what it is already good at. GitHub handles events, permissions, and comments. Git handles durable history. The repo filesystem handles configuration and local state. The runner handles compute. The LLM provider handles inference. The agent framework handles tool calls. No layer is asked to become metaphysical.

This is an underappreciated kind of systems thinking. Modern engineering culture sometimes mistakes novelty for design. A system feels architected only if it introduces custom abstractions and specialized services. This repo reminds us that composition itself is architecture. It is possible to produce a genuinely new capability by reinterpreting existing primitives rather than inventing new ones.

There is also an operational upside to this composed minimalism: observability is less fragmented. Workflow logs are in GitHub. Comments are in GitHub. Transcripts are in the repo. Configuration is in the repo. Identity is in the repo. Installation logic is in the repo. For small teams or solo maintainers, that concentration may be more valuable than sophisticated but scattered stacks. Troubleshooting happens in a smaller conceptual space.

Of course, centralizing everything inside GitHub also creates dependencies on GitHub’s operational model. Runners are ephemeral. Comment lengths are limited. Permissions can be broader than ideal. Hosted runners include tooling and privileges you may not fully control. The repo is candid about these drawbacks. But those drawbacks are not failures of the architecture so much as reminders that leveraging existing infrastructure means inheriting its strengths and weaknesses.

There is a broader strategic lesson here for AI tooling. Many teams are now building systems that require persistent context, reproducible automation, human-in-the-loop review, and codebase proximity. The default instinct is to reach for a new backend and new product surface. This repo demonstrates an alternative path: ask what the existing collaboration substrate already offers before inventing a parallel world. Often the architecture is not missing. It is simply unrecognized.

In that light, the phrase “GitHub as infrastructure” becomes more precise. It does not mean GitHub is literally everything. The LLM API still exists elsewhere. Bun and the `pi` package still come from outside. But GitHub supplies enough of the control plane, storage plane, event plane, and execution plane that a surprisingly complete agent system can emerge with very little additional machinery. That is not zero architecture. It is architecture by inheritance.

## 11. Economic and organizational implications: ownership, lock-in, and cost surfaces

Beyond technical elegance, this repository makes a practical economic argument. Repository-native AI changes who owns the artifacts, who bears the switching cost, and where lock-in accumulates.

The standard SaaS AI model centralizes value in the vendor’s platform. Conversations happen there. Memory lives there. Prompt templates live there. Integrations are mediated there. If a team leaves, it often leaves behind context, history, and operational habits. The provider becomes not just a model vendor but a workflow landlord.

This repo resists that pattern. Because prompts, transcripts, persona files, docs, and code changes are all committed into the repository, a team’s accumulated intelligence work is not stranded outside its own source tree. Even the agent runtime is packaged as a dependency. That does not eliminate every external dependency—the LLM provider still matters—but it changes the balance of power. The project’s value accrues to the repository, not only to the vendor.

This has several consequences.

First, switching costs move downward. A team can change `defaultProvider` and `defaultModel` in `.pi/settings.json` and wire a different secret without abandoning the repo-native operating model. The README lists multiple providers: OpenAI, Anthropic, Google Gemini, xAI, DeepSeek via OpenRouter, Mistral, Groq, and arbitrary OpenRouter models. That diversity is not just a feature checklist. It is an anti-lock-in strategy.

Second, audit value compounds locally. Every prompt/response cycle committed to the repo becomes part of the project’s own asset base. The knowledge created by using the agent is not merely consumed; it is stored as institutional memory under the team’s control. This is especially important for long-lived codebases where rationale, tradeoffs, and historical context are often more valuable than the immediate answer to a single prompt.

Third, infrastructure costs are legible in familiar terms. Instead of paying for an AI product’s entire hosted stack, the team mainly pays for GitHub Actions usage and LLM inference. Those are not trivial costs, but they are direct costs attached to recognizable resources. The system avoids hidden markup from a platform whose primary value may be wrapping the same primitives in a proprietary shell.

Fourth, the project makes small teams more capable without demanding a corresponding expansion in ops burden. This is a subtle organizational benefit. The more a tool can live inside existing workflows, the less institutional energy is needed to support it. Training, access management, debugging, and review can piggyback on routines the team already has.

There is also a strategic implication for open source. Open-source projects often struggle to adopt AI assistance because hosted tools feel misaligned with public collaboration norms or with the need for transparent decision trails. A repository-native approach is unusually compatible with open-source expectations. Issues are already public conversations. Commits are already public artifacts. Configuration is already inspectable. If an AI assistant is going to collaborate in open source, doing so inside the repository is arguably the most culturally coherent approach.

That said, economics are not one-sided. Storing more state in Git has costs. Running Actions for conversational work consumes minutes. Public repo transcripts can expose more than a team intends. Organizations with strict security requirements may prefer self-hosted runners or stricter network controls, which reintroduce ops overhead. But these costs remain tied to infrastructure the team likely already understands, rather than to a separate AI platform whose cost model and retention guarantees may be opaque.

All of this reinforces the repo’s larger argument: infrastructure ownership is not just about where code runs. It is about where leverage accumulates. This repository tries to ensure that leverage accumulates in the user’s repo, under the user’s governance, with the user’s history attached. That is a meaningful economic stance, not just a technical style.

## 12. Contradictions, tensions, and the honesty of an unfinished category

It would be easy to celebrate this repo as a solved model for repository-native AI. That would be unfair to the project, because the repo itself is full of evidence that the category remains unfinished. In fact, one of its strengths is that it leaves its tensions visible.

A small but telling example is the configuration drift between documentation and runtime. The README still describes a default OpenAI model of `gpt-5.3-codex`, while `.pi/settings.json` currently points to `gpt-5.4` with high thinking. This is not a scandal. It is a normal sign of a living repository. But it captures an important truth: when the repo is the product, documentation drift is product drift. The benefits of local explicitness also impose a discipline of local upkeep.

There are deeper tensions too.

The project celebrates zero external infrastructure, but it depends on GitHub-hosted runners and external LLM APIs. That is not hypocrisy; it is a matter of framing. The system avoids bespoke infrastructure, not all infrastructure. Still, the distinction matters. For some readers, GitHub itself is a huge platform dependency, not a neutral substrate. The repo’s thesis is strongest for teams that already treat GitHub as a central operating environment.

The project celebrates durable memory in Git, but Git is not an ideal store for every kind of conversational state. Repositories can grow. Sensitive information can become awkwardly durable. Transcript history can be noisier than purpose-built knowledge representations. The repo acknowledges some of this, especially through warnings about public visibility and security. Yet the tension remains. Turning Git into memory is powerful precisely because it repurposes a tool designed for other kinds of persistence.

The project celebrates autonomy and low ceremony, but its security documents strongly suggest that safer deployments may require more ceremony: branch protections, PR-based review flows, scoped tokens, CODEOWNERS, maybe self-hosted runners, maybe network restrictions. In other words, the practical path from proof-of-concept to production may be a path away from some of the very immediacy that makes the demo compelling. This is common in infrastructure design, but worth stating plainly.

There is also a philosophical tension around predictability. The repo makes the agent unusually inspectable by checking in identity, settings, docs, and session history. That is admirable. Yet the core reasoning engine is still a language model whose outputs are not fully deterministic even under controlled configuration. The project narrows uncertainty but cannot abolish it. The repository can be the mind’s habitat, but the mind is still probabilistic.

Another tension concerns governance locality. Having everything in the repo is empowering, but it can also concentrate too much trust in the repo’s maintainers. If the repo is the constitution, then whoever can merge changes to that constitution holds substantial power. This is not unique to this project—maintainers already have power—but the more behavior is encoded locally, the more governance quality depends on repository discipline.

And then there is the question of scale. The architecture is beautiful for repo-scoped collaboration, but what happens when teams want shared memory across many repos, organization-wide policies, richer analytics, or fine-grained review queues for agent proposals? The GitHub App route hints at answers, but the repo is careful not to overclaim. It proves that a repo can host an agent. It does not claim that every possible AI workflow should be flattened into issue comments and session JSONL files.

These tensions are not flaws in the project so much as evidence that it inhabits a genuinely interesting frontier. The repo is trying to find the natural boundary between general collaboration infrastructure and specialized AI infrastructure. It is saying, in effect: start as locally as possible, inherit as much as you can, and only add new planes when the old ones truly fail. That is a wise heuristic even if the endpoint differs by team.

In this sense, the repository’s contradictions are part of its value. They prevent it from becoming dogma. “GitHub as Infrastructure” is not a universal law. It is a design proposition tested in code. Its power lies not in erasing trade-offs but in making them legible.

## 13. The GitHub App path: from repo-locality to organizational scale

Although the folder-based installation is the most philosophically pure expression of the project, the inclusion of `app-manifest.json` reveals that the maintainers are also thinking about how repository-native intelligence scales across organizations.

The manifest describes a public GitHub App named `github-minimum-intelligence` with write access to issues, contents, and actions, plus metadata read access. It subscribes to `issues`, `issue_comment`, `installation`, and `installation_repositories` events, and points users back to the repository’s quick-start documentation. This is not just a convenience artifact. It is an attempt to marry the repo-local architecture to GitHub’s organizational installation model.

Why does this matter? Because the project’s architecture has a built-in tension between local control and organizational replication. The folder model is empowering because each repository owns its own identity, settings, history, and workflow definitions. But organizations often want a more centralized trust surface for automation—one app identity, consistent permissions, potentially broader rollout. The manifest path addresses that without abandoning the repo as the main habitat.

The README is careful here. Running as a GitHub App gives the agent its own bot identity, consistent permissions across repositories, and a path toward multi-repo installation without copy-pasting files. Yet the App does not eliminate the need for the `.github-minimum-intelligence/` folder. If the target repo does not already have it, the quick setup script still needs to run. This preserves the project’s architectural center: the repo remains the place where behavior, state, and governance live.

This hybrid model is interesting because it points toward a broader design space for AI infrastructure. We do not necessarily need to choose between total centralization and total locality. A GitHub App can provide identity and installability while the repository continues to provide memory, configuration, and workflow logic. In other words, the control plane can be partially centralized while the behavioral plane remains local.

That has organizational benefits. Bot identity can be cleaner. Permissions can be more consistent. Installation can be easier across many repos. At the same time, teams retain the ability to inspect and modify the local agent files. The repo does not become a thin client to a hidden service. It remains a self-describing environment.

However, the security docs also complicate this picture by warning about token scope and cross-repository blast radius. In their current assessments, org-wide repository access is one of the most serious risks. That means any move toward organizational scale must be accompanied by stricter permission discipline, not looser trust. Again, the repo’s honesty is useful. It prevents us from reading “GitHub App” as automatically more mature or safer. Scale changes the security calculus.

Still, the presence of the App manifest shows that the project is not merely a local hack. It has thought about how the same architectural thesis might operate across an organization. The interesting part is that even in doing so, it does not abandon the core principle that the repository itself should remain the primary site of intelligence. The App extends reach; it does not replace locality.

## 14. Why this matters beyond this repo

It would be possible to read this repository as an isolated cleverness: an elegant GitHub trick for running an AI coding agent through issues and workflows. That would undersell its broader significance.

What this repo demonstrates is a general pattern that may matter for the next phase of developer tooling. For years, the industry’s implicit assumption was that intelligence had to be centralized to be useful. Models were expensive, tooling was immature, and integration surfaces were narrow. As a result, the dominant design pattern was to build AI features into hosted platforms and invite the user to bring their code into those worlds.

But as model access standardizes and tool harnesses improve, the center of gravity can shift. The more reusable the model layer becomes, the more valuable the surrounding infrastructure decisions become. Where does memory live? Who owns prompt history? Which permissions govern action? Where are instructions versioned? How are outputs reviewed? How do conversations reattach to work? These are not questions the model can answer. They are infrastructure questions.

This repository offers one strong answer: put the agent inside the collaboration substrate developers already use. Let the repo remain the canonical object. Let workflows provide execution. Let issues provide interaction. Let Git provide continuity. Let Markdown provide governance. Treat the model as one component in a system, not as the system itself.

That pattern has applicability far beyond this specific agent.

It could shape documentation assistants that answer from repo-local docs and commit improved explanations back into the tree.

It could shape release agents that reason over changelogs, issues, and commits to draft release notes in versioned files.

It could shape security agents that operate under stricter readiness modes, scanning and commenting without writing until approval is granted.

It could shape domain-specific research agents whose institutional memory must stay attached to regulated or proprietary codebases.

It could shape open-source maintainership workflows where AI participation must be fully inspectable and versioned to preserve community trust.

In each case, the infrastructural lesson is the same: before building an AI platform around the repository, ask whether the repository is already a viable platform for the AI.

There is also a cultural implication. Repository-native intelligence preserves the dignity of the codebase. That sounds lofty, but it matters. In many AI workflows, the codebase becomes source material fed into another product. Here, the codebase remains sovereign. The AI comes to it. That inversion respects the fact that repositories are not raw data dumps. They are the living centers of software projects, containing not just code but history, intent, norms, and social process.

This is why the repo’s phrase “The Repo Is the Mind” is more than branding. It captures a serious idea: the meaningful context for software work is already concentrated in the repository and its adjacent collaboration surfaces. An agent that lives elsewhere must constantly reconstruct that context. An agent that lives here begins where the truth already is.

## Conclusion: infrastructure revealed by relocation

What, finally, does this repository prove?

It proves that GitHub is not just a place where code is stored and CI jobs happen to run. It is a layered infrastructure environment with an event system, permission model, execution runtime, communication surfaces, durable history, and programmable artifacts. It proves that Git is not just version control but a usable memory substrate for agents when conversation and state are made file-shaped. It proves that Markdown can act as governance, identity, and institutional self-description. It proves that a folder can sometimes be a stronger product boundary than a platform. And it proves that much of what modern AI tooling treats as proprietary magic can be reconstructed from ordinary developer primitives with surprising elegance.

This does not mean the repository solves everything. It does not eliminate security risk. It does not abolish the need for careful governance. It does not make stochastic systems deterministic. It does not make GitHub-hosted runners intrinsically safe. It does not guarantee that every organization should adopt this model wholesale. But it does something more foundational: it redraws the map of what is plausible.

By relocating the agent into the repository, the project reveals infrastructure that was already there but conceptually underused. Issues become UI. Actions become compute. Git becomes storage. The repo becomes memory, policy, and habitat. Once seen this way, GitHub stops looking like a mere host and starts looking like an operating environment for intelligence-bearing workflows.

That is the repo’s real achievement. It is not that it built an AI assistant for GitHub. It is that it made GitHub itself newly visible as infrastructure.

And that visibility matters. In software, architectural progress often comes not from inventing entirely new systems, but from recognizing the latent power of the systems we already have. This repository is an example of that recognition. It treats the repository not as a passive container for code, but as an active computational boundary—a place where conversation, memory, identity, execution, and governance can coexist.

“GitHub as Infrastructure” is therefore more than the title of an essay. It is the clearest name for the proposition this repo stages in code. The agent is important. The runtime is clever. The docs are unusually thoughtful. But the deepest contribution is conceptual: the realization that a repository can be more than a source artifact. It can be the minimal sovereign environment in which an intelligent collaborator lives, remembers, acts, and is held accountable.

That is a powerful idea. This repository makes it concrete.
