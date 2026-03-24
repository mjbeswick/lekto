# Lekto – Agent Instructions

## Releases

- Releases **must always include an APK** as a release asset.
- The GitHub Actions workflow (`.github/workflows/release.yml`) builds and attaches the APK automatically when a tag matching `v*` is pushed.
- **Never create a release manually with `gh release create`** — always create and push the tag instead so the workflow runs:

  ```bash
  git tag v1.x.x
  git push origin v1.x.x
  ```

- The workflow will build the APK, create the GitHub release, and attach `lekto-<version>.apk` as a release asset.

## Commits

- Create a git commit after every repository change you make.
- Keep commits focused and use clear, non-interactive commit messages.
