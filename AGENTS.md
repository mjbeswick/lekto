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

## Desktop (Electrobun)

The desktop shell uses [Electrobun](https://blackboard.sh/electrobun/) (v1.12.3) and lives in `desktop/`.

### Install desktop dependencies

```bash
cd desktop && bun install
```

### Run in development

Start the Vite dev server in one terminal:

```bash
npm run dev
```

Then in another terminal launch the Electrobun main process:

```bash
npm run desktop:dev
```

### Build for distribution

```bash
npm run desktop:build
```

This runs `npm run build` (Vite) then `bun run electrobun build` to produce a native app bundle.

### Platform support

- macOS 14+
- Windows 11+
- Linux Ubuntu 22.04+
