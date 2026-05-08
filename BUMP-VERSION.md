# Version Bump Checklist

## Version Files Updated by `bump-version.sh`

The script at `scripts/bump-version.sh` automatically updates all 4 files below.
Run it instead of editing them manually.

```bash
# Bump patch (1.0.0 → 1.0.1)
./scripts/bump-version.sh patch

# Bump minor (1.0.0 → 1.1.0)
./scripts/bump-version.sh minor

# Bump major (1.0.0 → 2.0.0)
./scripts/bump-version.sh major
```

| File | Field(s) Updated |
|------|-----------------|
| `package.json` | `version` |
| `Resources/Info.plist` | `CFBundleShortVersionString`, `CFBundleVersion` (auto-incremented build number) |
| `project.yml` | `CFBundleShortVersionString`, `CFBundleVersion` |
| `scripts/create-pkg.sh` | `PRODUCT_VERSION` |

## Manual Checklist

- [ ] Run `./scripts/bump-version.sh [major|minor|patch]`
- [ ] Verify all 4 files were updated correctly
- [ ] Update `CHANGELOG.md` with changes since last release
- [ ] Verify all new dependencies are committed (`package-lock.json`)
- [ ] Build and smoke-test: `npm run build` (or your build command)
- [ ] Confirm app icon / assets are up to date if visual changes were made

## Tagging & Push

```bash
# 1. Bump versions (script handles all files)
./scripts/bump-version.sh patch   # or minor / major

# 2. Commit version bump
git add package.json Resources/Info.plist project.yml scripts/create-pkg.sh
git commit -m "Bump version to X.Y.Z"

# 3. Create annotated tag
git tag -a vX.Y.Z -m "Version X.Y.Z"

# 4. Push commits and tag
git push origin main
git push origin vX.Y.Z
```

## Verify Tag Contents

```bash
# Confirm version in tag
git show vX.Y.Z:package.json | grep '"version"'
git show vX.Y.Z:Resources/Info.plist | grep -A1 'CFBundleShortVersionString'
git show vX.Y.Z:project.yml | grep 'CFBundleShortVersionString'
git show vX.Y.Z:scripts/create-pkg.sh | grep 'PRODUCT_VERSION'
```
