# Keybindings Menu — Design Spec
Date: 2026-05-24

## Summary

Add a **Keybindings** tab to the existing Settings modal, positioned between the Appearance and About tabs. Users can remap any of the 14 app commands using VS Code-style click-to-capture, reset individual bindings to their defaults, and receive advisory conflict warnings when two actions share the same shortcut.

---

## Data & Storage

The `Settings` interface gains one new optional field:

```ts
keybindings?: Record<string, string>  // e.g. { newTab: '⌘⇧T' }
```

Only overridden bindings are stored. The app resolves a binding at runtime by checking `settings.keybindings[id]` first, falling back to the default in the `commands` array. Resetting a binding removes its key from the record. The field round-trips through the existing `saveSettings` / `getSettings` IPC channels — no new backend wiring required.

`DEFAULT_SETTINGS.keybindings` is initialized to `{}`.

---

## UI & Tab Structure

A third tab button is inserted in the settings tab nav:

```
[ Appearance ]  [ Keybindings ]  [ About ]
```

The `stab-keybindings` panel contains a three-column table:

| Column | Description |
|--------|-------------|
| **Action** | Read-only command label (e.g. "New Tab") |
| **Shortcut** | Clickable chip showing current binding; enters capture mode on click |
| **Reset** | ↺ icon button; visible/active only when an override exists for that command |

All 14 entries from the existing `commands` array are listed. The panel lives entirely inside the Settings modal — nothing is added to the main window.

---

## Capture Mode

1. User clicks a shortcut chip → chip displays `"Press keys…"` and a one-shot `keydown` listener is attached to `document`.
2. Any modifier + key combo (e.g. `Ctrl+Shift+N`) is recorded and normalized to the display symbol format (e.g. `⌃⇧N`). Pressing `Escape` cancels with no change.
3. The recorded combo is written into the in-memory keybindings overlay (not yet persisted — persists on Save).
4. If the combo is already used by another command, a red inline warning appears below the row: `"Already used by [Action Name]"`. The binding is still accepted (advisory only, matching VS Code behavior).
5. The ↺ reset button becomes visible for that row. Clicking it removes the override and reverts the chip to the default.

---

## Conflict Detection

Conflict check runs after every successful capture. It scans all commands, resolving each to its effective binding (`settings.keybindings[id] ?? command.shortcut`), and flags any that match the newly entered combo (excluding the command being edited). Only one warning is shown per row at a time. Warnings clear automatically if the user re-captures a non-conflicting combo or resets.

---

## Command Dispatcher Update

The existing capture-phase `keydown` handler (around `renderer.ts:416`) currently matches against hard-coded `command.shortcut` strings. It is updated to resolve each command's effective binding as:

```ts
const effective = this.settings.keybindings?.[cmd.id] ?? cmd.shortcut;
```

This means remapped bindings take effect immediately after saving settings, with no restart required.

---

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/index.html` | Add Keybindings tab button; add `stab-keybindings` panel with table markup and CSS for chip, capture state, conflict warning, reset button |
| `src/renderer/renderer.ts` | Extend `Settings` interface; add `renderKeybindingsTable()`, `startKeybindCapture(id)`; update `showSettings()`, `saveSettings()`, and the keydown dispatcher |
| `src/main/main.ts` | No changes — keybindings field round-trips through existing settings path |

---

## Out of Scope

- Exporting/importing keybindings as a file
- Multiple keybind profiles
- Binding commands to mouse buttons
- Keybindings for xterm.js internal actions (scrolling, selection)
