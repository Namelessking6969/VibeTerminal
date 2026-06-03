# Smart Command Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After 2 consecutive failed terminal commands, show an inline overlay suggesting a rule-based corrected command with Yes (paste) / No (dismiss) options.

**Architecture:** A `CommandTracker` in the Electron main process intercepts user keystrokes and PTY output per terminal, detects 2 consecutive failures via error pattern matching, runs a rule engine, and sends the result to the renderer via IPC. The renderer shows a themed overlay; Yes pastes the corrected command into the active terminal, No dismisses.

**Tech Stack:** TypeScript, Electron IPC, node-pty, xterm.js, vitest (new)

---

## File Structure

**New files:**
- `src/main/commandTracker.ts` — tracks commands and output per terminal, triggers correction
- `src/main/rules/index.ts` — Rule interface + `runRules()` orchestrator
- `src/main/rules/sudo.ts` — "permission denied" → prepend sudo
- `src/main/rules/gitTypo.ts` — git "did you mean" → extract suggestion
- `src/main/rules/cdNotADir.ts` — cd "Not a directory" → swap to ls
- `src/main/rules/wrongFlag.ts` — unknown option → strip bad flag
- `tests/rules/sudo.test.ts`
- `tests/rules/gitTypo.test.ts`
- `tests/rules/cdNotADir.test.ts`
- `tests/rules/wrongFlag.test.ts`
- `tests/rules/index.test.ts`
- `tests/commandTracker.test.ts`
- `vitest.config.ts`

**Modified files:**
- `package.json` — add vitest dev dependency + test script
- `src/main/main.ts` — instantiate CommandTracker per terminal; add IPC channels
- `src/preload/preload.ts` — expose `onCorrectionSuggestion` + `dismissCorrection`
- `src/renderer/index.html` — add correction overlay CSS
- `src/renderer/renderer.ts` — add correction overlay show/hide logic

---

### Task 1: Set up vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest works**

Create `tests/sanity.test.ts`:

```typescript
describe('sanity', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: `✓ tests/sanity.test.ts > sanity > works`

- [ ] **Step 5: Delete sanity test**

```bash
rm tests/sanity.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

### Task 2: Rule interface and runRules()

**Files:**
- Create: `src/main/rules/index.ts`
- Create: `tests/rules/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rules/index.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { runRules } from '../../src/main/rules/index';
import type { Rule } from '../../src/main/rules/index';

describe('runRules', () => {
  it('returns null when no rule matches', () => {
    expect(runRules('ls -la', 'total 0')).toBeNull();
  });

  it('returns the first matching rule fix', () => {
    const result = runRules('git psuh', "git: 'psuh' is not a git command\nDid you mean this?\n\tpush");
    expect(result).toBe('git push');
  });

  it('stops at the first matching rule and does not apply subsequent rules', () => {
    // sudo rule matches "permission denied" — should not also apply git rule
    const result = runRules('git push', 'permission denied');
    expect(result).toBe('sudo git push');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/rules/index.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/rules/index'`

- [ ] **Step 3: Create the rule interface and registry**

Create `src/main/rules/index.ts`:

```typescript
export interface Rule {
  match(command: string, errorOutput: string): boolean;
  fix(command: string, errorOutput: string): string;
}

// Rules are imported here after they are created in Tasks 3-6.
// Placeholder array — each task adds its rule to this list.
const RULES: Rule[] = [];

export function runRules(command: string, errorOutput: string): string | null {
  for (const rule of RULES) {
    if (rule.match(command, errorOutput)) {
      return rule.fix(command, errorOutput);
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests — expect partial failure**

```bash
npm test -- tests/rules/index.test.ts
```

Expected: "returns null when no rule matches" PASS; the other two FAIL because RULES is empty. That is correct — they will pass once rules are added in Tasks 3–6.

- [ ] **Step 5: Commit**

```bash
git add src/main/rules/index.ts tests/rules/index.test.ts
git commit -m "feat: add rule interface and runRules() orchestrator"
```

---

### Task 3: sudo rule

**Files:**
- Create: `src/main/rules/sudo.ts`
- Create: `tests/rules/sudo.test.ts`
- Modify: `src/main/rules/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rules/sudo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sudoRule } from '../../src/main/rules/sudo';

describe('sudoRule', () => {
  it('matches permission denied errors', () => {
    expect(sudoRule.match('cp file /etc/hosts', 'cp: /etc/hosts: Permission denied')).toBe(true);
  });

  it('is case-insensitive for permission denied', () => {
    expect(sudoRule.match('rm /usr/bin/foo', 'rm: cannot remove: PERMISSION DENIED')).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(sudoRule.match('ls foo', 'ls: foo: No such file or directory')).toBe(false);
  });

  it('prepends sudo to the command', () => {
    expect(sudoRule.fix('cp file /etc/hosts', '')).toBe('sudo cp file /etc/hosts');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/rules/sudo.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/rules/sudo'`

- [ ] **Step 3: Implement the sudo rule**

Create `src/main/rules/sudo.ts`:

```typescript
import type { Rule } from './index';

export const sudoRule: Rule = {
  match(_command: string, errorOutput: string): boolean {
    return /permission denied/i.test(errorOutput);
  },
  fix(command: string): string {
    return `sudo ${command}`;
  },
};
```

- [ ] **Step 4: Register the rule**

In `src/main/rules/index.ts`, replace the existing import block and RULES array:

```typescript
import { sudoRule } from './sudo';

const RULES: Rule[] = [
  sudoRule,
];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/rules/sudo.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/rules/sudo.ts src/main/rules/index.ts tests/rules/sudo.test.ts
git commit -m "feat: add sudo correction rule"
```

---

### Task 4: git-typo rule

**Files:**
- Create: `src/main/rules/gitTypo.ts`
- Create: `tests/rules/gitTypo.test.ts`
- Modify: `src/main/rules/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rules/gitTypo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { gitTypoRule } from '../../src/main/rules/gitTypo';

const GIT_ERROR = `git: 'psuh' is not a git command. See 'git --help'.

The most similar command is
\tpush`;

describe('gitTypoRule', () => {
  it('matches git commands with did-you-mean output', () => {
    expect(gitTypoRule.match('git psuh', GIT_ERROR)).toBe(true);
  });

  it('does not match non-git commands', () => {
    expect(gitTypoRule.match('npm psuh', GIT_ERROR)).toBe(false);
  });

  it('does not match git errors without a suggestion', () => {
    expect(gitTypoRule.match('git psuh', "git: 'psuh' is not a git command")).toBe(false);
  });

  it('extracts the suggested git subcommand', () => {
    expect(gitTypoRule.fix('git psuh', GIT_ERROR)).toBe('git push');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/rules/gitTypo.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/rules/gitTypo'`

- [ ] **Step 3: Implement the git-typo rule**

Create `src/main/rules/gitTypo.ts`:

```typescript
import type { Rule } from './index';

export const gitTypoRule: Rule = {
  match(command: string, errorOutput: string): boolean {
    return command.startsWith('git ') && /did you mean|most similar/i.test(errorOutput);
  },
  fix(_command: string, errorOutput: string): string {
    const m = errorOutput.match(/\n\s+(\S+)\s*$/m);
    return m ? `git ${m[1].trim()}` : _command;
  },
};
```

- [ ] **Step 4: Register the rule**

In `src/main/rules/index.ts`, update imports and RULES:

```typescript
import { sudoRule } from './sudo';
import { gitTypoRule } from './gitTypo';

const RULES: Rule[] = [
  sudoRule,
  gitTypoRule,
];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/rules/gitTypo.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/rules/gitTypo.ts src/main/rules/index.ts tests/rules/gitTypo.test.ts
git commit -m "feat: add git typo correction rule"
```

---

### Task 5: cd-not-a-dir rule

**Files:**
- Create: `src/main/rules/cdNotADir.ts`
- Create: `tests/rules/cdNotADir.test.ts`
- Modify: `src/main/rules/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rules/cdNotADir.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cdNotADirRule } from '../../src/main/rules/cdNotADir';

describe('cdNotADirRule', () => {
  it('matches cd into a file', () => {
    expect(cdNotADirRule.match('cd README.md', 'cd: not a directory: README.md')).toBe(true);
  });

  it('is case-insensitive for not a directory', () => {
    expect(cdNotADirRule.match('cd foo.txt', 'cd: Not A Directory: foo.txt')).toBe(true);
  });

  it('does not match non-cd commands', () => {
    expect(cdNotADirRule.match('ls README.md', 'Not a directory')).toBe(false);
  });

  it('replaces cd with ls', () => {
    expect(cdNotADirRule.fix('cd src/main/main.ts', '')).toBe('ls src/main/main.ts');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/rules/cdNotADir.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/rules/cdNotADir'`

- [ ] **Step 3: Implement the cd-not-a-dir rule**

Create `src/main/rules/cdNotADir.ts`:

```typescript
import type { Rule } from './index';

export const cdNotADirRule: Rule = {
  match(command: string, errorOutput: string): boolean {
    return command.trimStart().startsWith('cd ') && /not a directory/i.test(errorOutput);
  },
  fix(command: string): string {
    return `ls ${command.trimStart().slice(3).trim()}`;
  },
};
```

- [ ] **Step 4: Register the rule**

In `src/main/rules/index.ts`, update imports and RULES:

```typescript
import { sudoRule } from './sudo';
import { gitTypoRule } from './gitTypo';
import { cdNotADirRule } from './cdNotADir';

const RULES: Rule[] = [
  sudoRule,
  gitTypoRule,
  cdNotADirRule,
];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/rules/cdNotADir.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/rules/cdNotADir.ts src/main/rules/index.ts tests/rules/cdNotADir.test.ts
git commit -m "feat: add cd-not-a-dir correction rule"
```

---

### Task 6: wrong-flag rule

**Files:**
- Create: `src/main/rules/wrongFlag.ts`
- Create: `tests/rules/wrongFlag.test.ts`
- Modify: `src/main/rules/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/rules/wrongFlag.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { wrongFlagRule } from '../../src/main/rules/wrongFlag';

describe('wrongFlagRule', () => {
  it('matches unknown option errors', () => {
    expect(wrongFlagRule.match('ls --foo', "ls: unknown option '--foo'")).toBe(true);
  });

  it('matches invalid flag errors', () => {
    expect(wrongFlagRule.match('git log --blah', "error: unknown switch 'b'\nusage: git log")).toBe(false);
  });

  it('matches invalid flag with that exact wording', () => {
    expect(wrongFlagRule.match('curl --nope url', "curl: invalid flag '--nope'")).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(wrongFlagRule.match('ls', 'permission denied')).toBe(false);
  });

  it('strips the bad long flag from the command', () => {
    expect(wrongFlagRule.fix('ls --foo -la', "unknown option '--foo'")).toBe('ls -la');
  });

  it('strips the bad short flag from the command', () => {
    expect(wrongFlagRule.fix('curl -Z https://example.com', "curl: invalid flag '-Z'")).toBe('curl https://example.com');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/rules/wrongFlag.test.ts
```

Expected: FAIL — `Cannot find module '../../src/main/rules/wrongFlag'`

- [ ] **Step 3: Implement the wrong-flag rule**

Create `src/main/rules/wrongFlag.ts`:

```typescript
import type { Rule } from './index';

const BAD_FLAG_RE = /(?:unknown option|invalid flag)[:\s']+(-{1,2}[\w-]+)/i;

export const wrongFlagRule: Rule = {
  match(_command: string, errorOutput: string): boolean {
    return BAD_FLAG_RE.test(errorOutput);
  },
  fix(command: string, errorOutput: string): string {
    const m = errorOutput.match(BAD_FLAG_RE);
    if (!m) return command;
    const badFlag = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return command.replace(new RegExp(`\\s+${badFlag}(?=\\s|$)`), '').trim();
  },
};
```

- [ ] **Step 4: Register the rule**

In `src/main/rules/index.ts`, update imports and RULES to the final form:

```typescript
import { sudoRule } from './sudo';
import { gitTypoRule } from './gitTypo';
import { cdNotADirRule } from './cdNotADir';
import { wrongFlagRule } from './wrongFlag';

const RULES: Rule[] = [
  sudoRule,
  gitTypoRule,
  cdNotADirRule,
  wrongFlagRule,
];
```

- [ ] **Step 5: Run all rule tests**

```bash
npm test
```

Expected: All tests pass including `tests/rules/index.test.ts` (the `runRules` cross-rule tests that were failing in Task 2 now pass because all rules are registered).

- [ ] **Step 6: Commit**

```bash
git add src/main/rules/wrongFlag.ts src/main/rules/index.ts tests/rules/wrongFlag.test.ts
git commit -m "feat: add wrong-flag correction rule"
```

---

### Task 7: CommandTracker

**Files:**
- Create: `src/main/commandTracker.ts`
- Create: `tests/commandTracker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/commandTracker.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  webContents: {
    fromId: vi.fn(() => ({
      isDestroyed: () => false,
      send: vi.fn(),
    })),
  },
}));

import { webContents } from 'electron';
import { CommandTracker } from '../src/main/commandTracker';

const PROMPT = '\r\n$ ';
const ERROR_OUTPUT = 'bash: foo: command not found\r\n$ ';

function typeCommand(tracker: CommandTracker, cmd: string): void {
  for (const ch of cmd) tracker.onInput(ch);
  tracker.onInput('\r');
}

describe('CommandTracker', () => {
  let mockWc: { send: ReturnType<typeof vi.fn>; isDestroyed: () => boolean };

  beforeEach(() => {
    mockWc = { send: vi.fn(), isDestroyed: () => false };
    vi.mocked(webContents.fromId).mockReturnValue(mockWc as never);
  });

  it('does not send a suggestion after one failure', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });

  it('sends correction-suggestion after two consecutive failures', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).toHaveBeenCalledWith('correction-suggestion', {
      terminalId: 1,
      corrected: null,
    });
  });

  it('resets consecutive failure count after a successful command', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    typeCommand(tracker, 'ls');
    tracker.onOutput('file.txt\r\n$ ');
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });

  it('sends the corrected command for a sudo fix', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'cp file /etc/hosts');
    tracker.onOutput('cp: /etc/hosts: Permission denied\r\n$ ');
    typeCommand(tracker, 'cp file /etc/hosts');
    tracker.onOutput('cp: /etc/hosts: Permission denied\r\n$ ');
    expect(mockWc.send).toHaveBeenCalledWith('correction-suggestion', {
      terminalId: 1,
      corrected: 'sudo cp file /etc/hosts',
    });
  });

  it('reset() clears all state', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    tracker.reset();
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/commandTracker.test.ts
```

Expected: FAIL — `Cannot find module '../src/main/commandTracker'`

- [ ] **Step 3: Implement CommandTracker**

Create `src/main/commandTracker.ts`:

```typescript
import { webContents } from 'electron';
import { runRules } from './rules/index';

const ANSI_RE = /\x1b\[[0-9;]*[mGKHFABCDsuJrh]|\x1b[()][AB012]|\x1b[=>M]|\r/g;
const PROMPT_RE = /[$%❯>#]\s*$/m;
const ERROR_PATTERNS = [
  /command not found/i,
  /permission denied/i,
  /no such file or directory/i,
  /not a git command/i,
  /unknown option/i,
  /invalid flag/i,
  /not a directory/i,
];

interface CommandRecord {
  command: string;
  output: string;
}

export class CommandTracker {
  private inputBuffer = '';
  private pendingCommand: string | null = null;
  private outputBuffer = '';
  private history: CommandRecord[] = [];
  private consecutiveFailures = 0;

  constructor(
    private readonly terminalId: number,
    private readonly webContentsId: number,
  ) {}

  onInput(data: string): void {
    if (data === '\r' || data === '\n') {
      const cmd = this.inputBuffer.trim();
      if (cmd) {
        this.pendingCommand = cmd;
        this.outputBuffer = '';
      }
      this.inputBuffer = '';
    } else if (data === '\x7f') {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    } else if (data.length === 1 && data >= ' ') {
      this.inputBuffer += data;
    }
  }

  onOutput(data: string): void {
    if (this.pendingCommand === null) return;
    this.outputBuffer += data;

    const clean = this.outputBuffer.replace(ANSI_RE, '');
    if (!PROMPT_RE.test(clean)) return;

    const command = this.pendingCommand;
    const output = clean;
    this.pendingCommand = null;
    this.outputBuffer = '';

    const failed = ERROR_PATTERNS.some((p) => p.test(output));
    if (failed) {
      this.history.push({ command, output });
      if (this.history.length > 2) this.history.shift();
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
      this.history = [];
    }

    if (this.consecutiveFailures >= 2) {
      this.consecutiveFailures = 0;
      this.sendSuggestion();
    }
  }

  reset(): void {
    this.inputBuffer = '';
    this.pendingCommand = null;
    this.outputBuffer = '';
    this.history = [];
    this.consecutiveFailures = 0;
  }

  private sendSuggestion(): void {
    const last = this.history[this.history.length - 1];
    if (!last) return;
    const corrected = runRules(last.command, last.output);
    const wc = webContents.fromId(this.webContentsId);
    if (wc && !wc.isDestroyed()) {
      wc.send('correction-suggestion', { terminalId: this.terminalId, corrected });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/commandTracker.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/commandTracker.ts tests/commandTracker.test.ts
git commit -m "feat: add CommandTracker — detects consecutive failures and runs rule engine"
```

---

### Task 8: Wire CommandTracker into main.ts

**Files:**
- Modify: `src/main/main.ts`

- [ ] **Step 1: Import CommandTracker at the top of main.ts**

At the top of `src/main/main.ts`, after the existing imports, add:

```typescript
import { CommandTracker } from './commandTracker';
```

- [ ] **Step 2: Add a tracker map alongside the terminals map**

After the line `const terminals = new Map<number, TerminalEntry>();` in `src/main/main.ts`, add:

```typescript
const trackers = new Map<number, CommandTracker>();
```

- [ ] **Step 3: Instantiate a tracker when a terminal is created**

Inside the `ipcMain.handle('create-terminal', ...)` handler, find the `ptyProcess.onData` block. Replace it with:

```typescript
ptyProcess.onData((data) => {
  const entry = terminals.get(id);
  if (!entry) return;
  const wc = webContents.fromId(entry.webContentsId);
  if (wc && !wc.isDestroyed()) {
    wc.send('terminal-data', { id, data });
  }
  trackers.get(id)?.onOutput(data);
});
```

Then, immediately after `terminals.set(id, ...)`, add:

```typescript
trackers.set(id, new CommandTracker(id, senderWcId));
```

And inside `ptyProcess.onExit`, after `terminals.delete(id)`, add:

```typescript
trackers.delete(id);
```

- [ ] **Step 4: Intercept terminal-input to feed the tracker**

Find the existing `ipcMain.on('terminal-input', ...)` handler and replace its body:

```typescript
ipcMain.on('terminal-input', (_event: IpcMainEvent, { id, data }: { id: number; data: string }) => {
  terminals.get(id)?.process.write(data);
  trackers.get(id)?.onInput(data);
});
```

- [ ] **Step 5: Add IPC handler for correction-dismissed**

After the existing `ipcMain.on('terminal-kill', ...)` handler, add:

```typescript
ipcMain.on('correction-dismissed', (_event: IpcMainEvent, { terminalId }: { terminalId: number }) => {
  trackers.get(terminalId)?.reset();
});
```

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
npm run build:ts
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/main/main.ts
git commit -m "feat: wire CommandTracker into terminal lifecycle in main process"
```

---

### Task 9: Add IPC to preload.ts

**Files:**
- Modify: `src/preload/preload.ts`

- [ ] **Step 1: Add the new IPC methods to terminalAPI**

In `src/preload/preload.ts`, inside the `terminalAPI` object, add these two entries after `onUpdateStatus`:

```typescript
onCorrectionSuggestion: (callback: Callback<{ terminalId: number; corrected: string | null }>): Unsubscribe => {
  const handler = (_event: IpcRendererEvent, data: { terminalId: number; corrected: string | null }) => callback(data);
  ipcRenderer.on('correction-suggestion', handler);
  return () => ipcRenderer.removeListener('correction-suggestion', handler);
},

dismissCorrection: (terminalId: number): void => {
  ipcRenderer.send('correction-dismissed', { terminalId });
},
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
npm run build:ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/preload/preload.ts
git commit -m "feat: expose correction suggestion IPC in preload bridge"
```

---

### Task 10: Add correction overlay CSS to index.html

**Files:**
- Modify: `src/renderer/index.html`

- [ ] **Step 1: Add CSS for the correction overlay**

In `src/renderer/index.html`, inside the `<style>` block, add before the closing `</style>` tag:

```css
    .correction-overlay {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1200;
      pointer-events: auto;
    }
    .correction-banner {
      background: var(--bg-secondary);
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
      color: var(--fg);
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      white-space: nowrap;
    }
    .correction-label { color: var(--fg-dim); }
    .correction-cmd { color: var(--accent); font-weight: 500; }
    .correction-btn {
      background: transparent;
      border: 1px solid var(--fg-dim);
      color: var(--fg);
      border-radius: 4px;
      padding: 2px 10px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }
    .correction-btn.yes { border-color: var(--accent); color: var(--accent); }
    .correction-btn:hover { opacity: 0.75; }
```

- [ ] **Step 2: Build renderer to verify no parse errors**

```bash
npm run build:renderer
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/index.html
git commit -m "feat: add correction overlay CSS"
```

---

### Task 11: Wire correction overlay in renderer.ts

**Files:**
- Modify: `src/renderer/renderer.ts`

- [ ] **Step 1: Add the CorrectionOverlay class**

In `src/renderer/renderer.ts`, after the existing type/interface definitions at the top, add the following class before the `TerminalManager` class:

```typescript
class CorrectionOverlay {
  private el: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private currentTerminalId: number | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  show(terminalId: number, corrected: string | null, onYes: (cmd: string) => void): void {
    this.hide();
    this.currentTerminalId = terminalId;

    const overlay = document.createElement('div');
    overlay.className = 'correction-overlay';

    if (corrected !== null) {
      overlay.innerHTML = `
        <div class="correction-banner">
          <span class="correction-label">Did you mean:</span>
          <span class="correction-cmd">${corrected.replace(/</g, '&lt;')}</span>
          <button class="correction-btn yes" id="corrYes">Yes [Y]</button>
          <button class="correction-btn" id="corrNo">No [N]</button>
        </div>`;
      overlay.querySelector('#corrYes')!.addEventListener('click', () => {
        onYes(corrected);
        this.hide();
      });
      overlay.querySelector('#corrNo')!.addEventListener('click', () => this.hide());
      this.dismissTimer = setTimeout(() => this.hide(), 10000);
    } else {
      overlay.innerHTML = `
        <div class="correction-banner">
          <span class="correction-label">Couldn't figure that one out.</span>
        </div>`;
      this.dismissTimer = setTimeout(() => this.hide(), 4000);
    }

    document.body.appendChild(overlay);
    this.el = overlay;

    this.keyHandler = (e: KeyboardEvent) => {
      if (corrected !== null && e.key.toLowerCase() === 'y') { onYes(corrected); this.hide(); }
      else if (e.key.toLowerCase() === 'n' || e.key === 'Escape') { this.hide(); }
      else if (e.key.length === 1) { this.hide(); }
    };
    document.addEventListener('keydown', this.keyHandler, { capture: true, once: false });
  }

  hide(): void {
    if (this.dismissTimer !== null) { clearTimeout(this.dismissTimer); this.dismissTimer = null; }
    if (this.keyHandler) { document.removeEventListener('keydown', this.keyHandler, { capture: true } as EventListenerOptions); this.keyHandler = null; }
    this.el?.remove();
    this.el = null;
    if (this.currentTerminalId !== null) {
      window.terminalAPI.dismissCorrection(this.currentTerminalId);
      this.currentTerminalId = null;
    }
  }
}
```

- [ ] **Step 2: Instantiate CorrectionOverlay in TerminalManager**

Inside the `TerminalManager` class, find where other manager properties are declared (near the top of the class body) and add:

```typescript
private readonly correctionOverlay = new CorrectionOverlay();
```

- [ ] **Step 3: Wire the suggestion listener in TerminalManager's constructor or init method**

Find the block in `TerminalManager` where other `window.terminalAPI.onXxx` listeners are registered (e.g. near `onData`, `onExit`). Add:

```typescript
window.terminalAPI.onCorrectionSuggestion(({ terminalId, corrected }) => {
  const tab = this.tabs.find((t) => t.id === this.activeTabId);
  if (!tab) return;
  const activeTermId = tab.terminals[tab.activeTerminalIndex]?.id;
  if (activeTermId !== terminalId) return;

  this.correctionOverlay.show(terminalId, corrected, (cmd) => {
    window.terminalAPI.write(terminalId, cmd);
  });
});
```

- [ ] **Step 4: Build the full project**

```bash
npm run build:all
```

Expected: No TypeScript or bundler errors.

- [ ] **Step 5: Run the app and test the happy path**

```bash
npm start
```

Manual test:
1. Open a terminal
2. Type a command that produces "permission denied" (e.g. `cat /etc/shadow`) — press Enter
3. Run the same command again
4. Verify: the correction overlay appears with `sudo cat /etc/shadow`
5. Press `Y` — verify the corrected command is pasted into the terminal (not run)
6. Press Enter to run it and confirm behavior

- [ ] **Step 6: Test the no-match path**

In the running app:
1. Type `blahblahblah` — press Enter (triggers "command not found")
2. Type `blahblahblah` again — press Enter
3. Verify: overlay shows "Couldn't figure that one out." and disappears after 4 seconds

- [ ] **Step 7: Test auto-dismiss on typing**

1. Trigger 2 permission-denied errors as above
2. When the overlay appears, start typing any character
3. Verify: overlay disappears immediately and the character appears in the terminal

- [ ] **Step 8: Commit**

```bash
git add src/renderer/renderer.ts
git commit -m "feat: add correction overlay UI — shows suggestion after 2 consecutive failures"
```

---

## Done

All tasks complete. The smart command correction feature is fully implemented:

- Rule engine in `src/main/rules/` with 4 rules (sudo, git-typo, cd-not-a-dir, wrong-flag)
- `CommandTracker` in `src/main/commandTracker.ts` detects 2 consecutive failures per terminal
- IPC pipeline: main → preload → renderer carries suggestions
- `CorrectionOverlay` in renderer shows themed inline overlay with Y/N/auto-dismiss
- Full unit + integration test coverage via vitest
