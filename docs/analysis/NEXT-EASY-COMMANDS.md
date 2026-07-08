# Implementable Commands (The "No-Undo" Set)

This document lists commands that can be implemented in Hermes Chat that do not require a "Global Undo" (as undoing system-level side-effects like `apt install` is impossible). These commands focus on **reversible**, **idempotent**, or **contextual** operations.

## 🛠 Workspace & Code Operations
*Manipulate the codebase and inspect files.*

*   `cat <path>`: View file content with line numbers.
*   `md <path>`: Render a Markdown file in the terminal.
*   `grep <pattern>`: Search for text/regex across the repository.
*   `find <pattern>`: Locate files matching a glob pattern.
*   `ls`: List directory contents.
*   `git <command>`: Run Git commands (e.g., `git status`, `git diff`).
*   `diff <path>`: Show changes for a specific file.
*   `run <command>`: Execute a shell command (with a built-in safety timeout).

## 🧠 Intelligence & Memory
*Manage the agent's understanding and context.*

*   `remember <text>`: Persistently save a fact or rule to `memory.log`.
*   `memories [term]`: Search long-term memory for a specific term.
*   `context`: View the current files and snippets held in the agent's active context window.
*   `pin <path>`: Keep a file permanently in the agent's context to prevent it from "forgetting."
*   `forget <id|term>`: Surgically remove specific information or assumptions from the current conversation history.
*   `semantic-search <term>`: Find conceptually related items via local embeddings.

## 🧵 Session & Threading
*Organize and navigate conversations.*

*   `new [name]`: Create and switch to a new conversation thread.
*   `switch <id|alias>`: Switch to an existing thread by ID or name.
*   `list`: List all existing conversation threads.
*   `rename <name>`: Change a thread's alias.
*   `history`: Show the conversation transcript for the current thread.
*   `export md`: Save the current thread as a Markdown file.
*   `retry`: Re-send the last prompt in the current thread.
*   `again`: Re-send the last prompt in a brand new thread (for comparison).
*   `best-of <n>`: Send the last prompt to `n` parallel threads and compare results.
*   `multiline`: Enter a multi-line input mode for large code blocks.

## ⚙️ Configuration & System
*Adjust the agent's runtime settings.*

*   `status`: View current runtime, model, thread, and git status.
*   `model <name>`: Switch the LLM model.
*   `provider <name>`: Switch the LLM provider (e.g., switching from cloud to local).
*   `time`: Toggle the display of execution time.
*   `verbose`: Toggle detailed JSONL event logging for debugging.
*   `auto-retry [on|off|N]`: Configure the number of automatic retries for failed turns.

## 📊 Telemetry & Observability
*Monitor cost, performance, and efficiency.*

*   `usage`: Show token consumption (Prompt/Completion) and estimated cost.
*   `stats`: View lifetime project statistics (total threads, total turns, total words).
*   `latency`: Monitor response speed (Time to First Token and total response time).
*   `efficiency`: Calculate the ratio of meaningful content vs. overhead/metadata.
