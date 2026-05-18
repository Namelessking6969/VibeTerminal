# Release Notes Body — Design Spec

**Date:** 2026-05-18
**Status:** Approved

## Overview

Add a formatted release body to GitHub Releases. Currently releases are created with `--notes ""` (empty). This change populates the body with a "What's New" section and a Downloads table on every tagged release.

## Changes

### 1. `.release-notes` (root)

Becomes the full release body. Updated before each tag. Contains two sections:

- `## What's New` — bullet points written by the developer per release
- `## Downloads` — static table listing actual built artifacts + platform warnings

Downloads table (fixed, matches actual CI artifacts):

| Platform | File | Notes |
|----------|------|-------|
| macOS | `.zip` | Intel (x64) |
| macOS | `.zip` | Apple Silicon (arm64) |
| macOS | `.pkg` | Intel installer |
| macOS | `.pkg` | Apple Silicon installer |
| Windows | `.exe` | NSIS installer |
| Linux | `.deb` | Debian / Ubuntu |

Platform warnings (fixed):
> **macOS**: builds are unsigned. Right-click → Open on first launch to bypass Gatekeeper.
> **Windows**: SmartScreen may warn on first run — click "More info → Run anyway".

### 2. `.github/workflows/build.yml` — release step

Single line change in the `gh release create` command:

```
--notes ""  →  --notes-file .release-notes
```

No other changes to the workflow.

## Scope

- 2 files changed: `.release-notes`, `.github/workflows/build.yml`
- No new dependencies, no new jobs, no structural changes
