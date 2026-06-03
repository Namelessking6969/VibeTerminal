# Smart Command Correction — Resume Point

## What We're Building

A "The Fuck"-inspired feature for VibeTerminal. After 2 consecutive failed terminal commands, an inline overlay appears suggesting a corrected command. Yes pastes it (doesn't run it), No dismisses.

## Key Docs

- **Design spec:** `docs/superpowers/specs/2026-06-03-smart-correction-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-06-03-smart-correction.md`

## Progress

### Done
- [x] Task 1: vitest test framework set up (`vitest.config.ts`, test/test:watch scripts added) — commit `0c1f21c`

### Done (all tasks complete)
- [x] Task 2: Rule interface + `runRules()` — `src/main/rules/index.ts` + tests
- [x] Task 3: sudo rule — `src/main/rules/sudo.ts` + tests
- [x] Task 4: git-typo rule — `src/main/rules/gitTypo.ts` + tests
- [x] Task 5: cd-not-a-dir rule — `src/main/rules/cdNotADir.ts` + tests
- [x] Task 6: wrong-flag rule — `src/main/rules/wrongFlag.ts` + tests
- [x] Task 7: CommandTracker — `src/main/commandTracker.ts` + tests
- [x] Task 8: Wire CommandTracker into `src/main/main.ts`
- [x] Task 9: Add IPC to `src/preload/preload.ts`
- [x] Task 10: Add overlay CSS to `src/renderer/index.html`
- [x] Task 11: Wire overlay UI in `src/renderer/renderer.ts`

## How to Resume

Tell Claude: **"Resume the smart correction feature implementation using subagent-driven development. Start from Task 2. The plan is at `docs/superpowers/plans/2026-06-03-smart-correction.md` and Task 1 (vitest setup) is already done."**

## Architecture Summary

- `CommandTracker` (main process) intercepts keystrokes + PTY output per terminal
- Detects 2 consecutive failures via error pattern matching
- Runs rule engine → sends `correction-suggestion` IPC to renderer
- Renderer `CorrectionOverlay` shows themed banner with Yes/No
- Yes: `window.terminalAPI.write(terminalId, correctedCmd)` — pastes, doesn't run
- No / timeout / typing: dismisses, sends `correction-dismissed` IPC back to reset tracker
