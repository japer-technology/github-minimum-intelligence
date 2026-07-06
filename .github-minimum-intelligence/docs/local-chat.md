# Local Chat

> [Index](./index.md) · Command reference for the terminal-based Local Chat REPL.

Local Chat (`bun run chat`, implemented in [`lifecycle/local-chat.ts`](../lifecycle/local-chat.ts))
runs the same agent identity used by the GitHub Actions flow — `AGENTS.md`,
`.pi/settings.json`, and `.pi/skills/` — from a local terminal against a local
or cloud LLM provider. Conversations are organized into **threads** with
closed-world identity: thread IDs are allocated by the tool, and unknown
references are rejected rather than auto-created on typos.

This document lists the help for **all** commands: the command-line (CLI) flags
you pass when launching, and the slash-commands available inside the interactive
REPL.

---

## Command-line usage

Invoke with `bun run chat` from the `.github-minimum-intelligence` directory.

| Invocation | Description |
|------------|-------------|
| `bun run chat` | Interactive launcher (pick an existing thread or create one). |
| `bun run chat --new [--name <alias>]` | Create a new thread and enter the REPL. |
| `bun run chat --thread <id\|alias> [prompt...]` | Continue a thread; enter the REPL if no prompt is given, otherwise send the prompt one-shot. |
| `bun run chat --list` | List all threads. |
| `bun run chat --rm <id\|alias>` | Delete a thread mapping. |
| `bun run chat --help` | Show the CLI help message. |

Short flags: `--thread`/`-t`, `--list`/`-l`, `--help`/`-h`.

### Environment overrides

These environment variables take the highest precedence (over `.pi/settings.json`
and built-in defaults):

| Variable | Description |
|----------|-------------|
| `LOCAL_PROVIDER` | Override `.pi/settings.json` `defaultProvider`. |
| `LOCAL_MODEL` | Override `defaultModel`. |
| `LOCAL_THINKING` | Override `defaultThinkingLevel` (e.g. `low`, `medium`, `high`). |
| `LOCAL_LLM_BASE_URL` | OpenAI-compatible base URL (LM Studio, Ollama, vLLM). Forwarded to `OPENAI_BASE_URL` with a placeholder API key. |

Precedence for provider/model: `LOCAL_*` env vars > `.pi/settings.json` >
built-in defaults.

---

## REPL commands

Inside a running chat session, lines beginning with `/` are commands; anything
else is sent to the model as a prompt. Type `/help` at any time to print the
full list. Commands are grouped below exactly as `/help` presents them.

### Thread

Closed-world identity — IDs are allocated by the tool.

| Command | Description |
|---------|-------------|
| `/list` | List all threads. |
| `/new [name]` | Create a new thread and switch to it. Optional alias must start with a letter (letters/digits/`_`/`-`, max 64). |
| `/switch <id\|alias>` | Switch to an existing thread. An unknown reference is an error (no auto-create). |
| `/history` | Condensed view of this thread's conversation. |
| `/export md` | Export this thread as a Markdown file (written under the sessions directory). `/export` alone behaves the same. |
| `/rename <name>` | Attach or replace this thread's alias. The name must be unique and match the alias grammar. |

### Model & config

| Command | Description |
|---------|-------------|
| `/status` | Show provider, resolved `pi --provider`, model, thinking level, thread, session turns/size, git branch, memory count, toggles (timing, verbose, auto-retry), uptime, and `OPENAI_BASE_URL` if set. |
| `/model <name>` | Switch the model for subsequent turns. With no argument, prints the current `provider:model`. |
| `/model <prov>:<name>` | Switch provider and model at once (e.g. `/model lmstudio:google/gemma-4-31b`). Re-wires local-server env vars for known local brands. |
| `/provider <name>` | Switch provider (`lmstudio`, `ollama`, `vllm`, `openai`, …). With no argument, prints the current provider and known brands. Selecting a local brand re-wires the base URL and enables auto-retry. |
| `/time` | Toggle the elapsed-time display. |
| `/verbose` | Toggle verbose mode (JSONL event counts). |
| `/auto-retry [on\|off\|N]` | Toggle auto-retry, or set the maximum number of attempts. `N` must be `1`–`10`; `off`/`0` disables it. With no argument, toggles the current state. |

### Memory log

| Command | Description |
|---------|-------------|
| `/remember <text>` | Append a timestamped entry to `memory.log`. |
| `/memories [term]` | Search `memory.log` for `term`, or show the 10 most recent entries when no term is given. |

### Files & repo

| Command | Description |
|---------|-------------|
| `/cat <path>` | Display a file with line numbers. Paths are restricted to inside the repository. |
| `/md <path>` | Render a Markdown file. Paths are restricted to inside the repository. |
| `/git` | Show `git status --short` plus a `git diff --stat` summary. |
| `/diff [path]` | Show `git diff`, optionally scoped to a path. |
| `/run <command>` | Run a shell command (30-second timeout). |

### Prompt

| Command | Description |
|---------|-------------|
| `/retry` | Re-send the last prompt in this thread. |
| `/again` | Create a new thread and re-send the last prompt. |
| `/best-of <n>` | Send the last prompt `n` times (`n` = 2–10) in fresh throwaway threads and compare the responses. |
| `/multiline` | Enter multiline input mode; type freely and submit with a blank line. |

### General

| Command | Description |
|---------|-------------|
| `/clear` | Clear the screen. |
| `/help` | Print the full command list. |
| `/exit`, `/quit` | End the chat session (Ctrl-C also quits at any time). |

---

## Notes

- Provider brands `lmstudio`, `ollama`, and `vllm` are treated as OpenAI-compatible
  local servers; switching to one auto-fills its default base URL
  (`http://localhost:1234/v1`, `http://localhost:11434/v1`, `http://localhost:8000/v1`
  respectively) and enables auto-retry.
- Session transcripts are written by `pi` into `state/sessions/` and preserved
  per thread; `/history` and `/export md` read from them.
- Unknown slash-commands print `Unknown command: <cmd>  (type /help)` rather than
  being sent to the model.

---

*Generated from the command help in [`lifecycle/local-chat.ts`](../lifecycle/local-chat.ts).*
