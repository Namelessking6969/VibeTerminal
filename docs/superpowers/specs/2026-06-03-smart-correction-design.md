# Smart Command Correction — Design Spec

**Date:** 2026-06-03  
**Status:** Approved  

---

## Overview

VibeTerminal will detect when a user runs two consecutive failed commands and automatically suggest a corrected command using a built-in rule engine. The suggestion appears as a non-intrusive inline overlay with Yes/No options. Yes pastes the corrected command into the terminal input without running it. If no rule matches, a brief "couldn't figure it out" message is shown.

---

## Architecture & Data Flow

```
PTY output (node-pty)
        │
        ▼
  CommandTracker          ← main process
  - detects command boundaries via shell prompt patterns
  - tracks exit codes from PTY
  - stores last 2 commands: { input, output, exitCode }
        │
   2 consecutive failures?
        │
        ▼
   RuleEngine             ← main process
  - iterates rule list against { command, errorOutput }
  - returns: { corrected: string } | null
        │
        ▼
   IPC → renderer
        │
        ▼
  SuggestionOverlay       ← renderer
  - shows suggestion + Yes / No
  - Yes: pastes corrected command into xterm input
  - No: dismisses
  - null result: shows "Couldn't figure that one out."
```

**Command boundary detection:** The `CommandTracker` identifies shell prompts using common patterns (`$`, `%`, `❯`, `#`) at the start of a new line after output settles. No shell config modification is required from the user.

---

## Rule Engine

Each rule implements two functions:

```ts
interface Rule {
  match(command: string, errorOutput: string): boolean;
  fix(command: string, errorOutput: string): string;
}
```

The engine iterates rules in order, stops at the first match, and returns the corrected command string. Returns `null` if no rule matches.

Rules live in individual files (`src/main/rules/*.ts`) for easy extension.

### Initial Rule Set

| Rule | Trigger | Fix |
|---|---|---|
| `sudo` | "permission denied" in output | Prepend `sudo` to command |
| `git-typo` | "did you mean" in git error output | Extract git's own suggestion |
| `command-not-found` | "command not found: foo" | Check for similar known binary |
| `cd-not-a-dir` | "Not a directory" | Swap `cd` for `ls` |
| `wrong-flag` | "unknown option" or "invalid flag" | Strip the bad flag |

---

## Suggestion Overlay (UI)

- Appears **inline at the bottom of the active terminal pane** — not a modal
- Styled to match the active theme (Vibe, Dracula, Nord, Monokai, Catppuccin)
- Single line: `Did you mean: <corrected command>?  [Yes]  [No]`
- Keyboard accessible: `Y` / `Enter` for Yes, `N` / `Escape` for No
- Auto-dismisses after 10 seconds with no input
- If user starts typing before responding, overlay dismisses automatically

**"No match" state:**
- Message: `Couldn't figure that one out.`
- Auto-dismisses after 4 seconds, no buttons

**Yes behavior:** Pastes corrected command into terminal input line. Does not run it.  
**No behavior:** Dismisses silently.

**Edge cases:**
- Only one overlay visible at a time — new trigger replaces old overlay
- Split panes: each pane maintains its own independent `CommandTracker`

---

## Error Handling

- Rule engine exceptions fail silently — no overlay shown, terminal unaffected
- IPC failures fail silently — correction is additive, never load-bearing
- Prompt detection misfires reset the 2-command window early — no harm done

---

## Testing

- **Unit:** Each rule tested in isolation with `{ command, errorOutput }` inputs
- **Unit:** `CommandTracker` tested with mock PTY output sequences to assert correct command/exit-code extraction
- **Integration:** Full flow tested — simulate 2 failures via mock PTY, assert correct IPC message and suggestion string
- No E2E overlay tests required; unit + integration coverage is sufficient
