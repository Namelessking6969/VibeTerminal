# Release Notes Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate GitHub Release bodies with a formatted "What's New" section and Downloads table on every tagged release.

**Architecture:** The `.release-notes` file at the repo root holds the full release body markdown (both sections). The `gh release create` command in `build.yml` is updated to pass `--notes-file .release-notes` instead of `--notes ""`. No other files change.

**Tech Stack:** GitHub Actions, `gh` CLI, Markdown

---

### Task 1: Update `.release-notes` with full release body template

**Files:**
- Modify: `.release-notes`

- [ ] **Step 1: Replace the contents of `.release-notes`**

The file should contain both sections. The "What's New" bullets are placeholders the developer updates before each tag; the Downloads table and warnings are fixed.

New content for `.release-notes`:

```markdown
## What's New

- 

## Downloads

| Platform | File | Notes |
|----------|------|-------|
| macOS | `.zip` | Intel (x64) |
| macOS | `.zip` | Apple Silicon (arm64) |
| macOS | `.pkg` | Intel installer |
| macOS | `.pkg` | Apple Silicon installer |
| Windows | `.exe` | NSIS installer |
| Linux | `.deb` | Debian / Ubuntu |

> **macOS**: builds are unsigned. Right-click → Open on first launch to bypass Gatekeeper.
> **Windows**: SmartScreen may warn on first run — click "More info → Run anyway".
```

- [ ] **Step 2: Commit**

```bash
git add .release-notes
git commit -m "chore: add release body template to .release-notes"
```

---

### Task 2: Wire `.release-notes` into the release workflow

**Files:**
- Modify: `.github/workflows/build.yml:122`

- [ ] **Step 1: Update the `gh release create` command**

In `.github/workflows/build.yml`, find this line in the `Publish release` step:

```yaml
gh release create "$TAG" --title "VibeTerminal $TAG" --latest --notes ""
```

Change it to:

```yaml
gh release create "$TAG" --title "VibeTerminal $TAG" --latest --notes-file .release-notes
```

No other lines in the file change.

- [ ] **Step 2: Verify the diff looks correct**

Run:
```bash
git diff .github/workflows/build.yml
```

Expected: exactly one line changed — `--notes ""` → `--notes-file .release-notes`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: use .release-notes file as GitHub release body"
```

---

## Usage Going Forward

Before tagging a release, open `.release-notes` and fill in the "What's New" bullets. The Downloads table and warnings never need to change. Then tag and push as normal — the release body will be populated automatically.
