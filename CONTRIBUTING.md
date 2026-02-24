# Contributing to Mobile Claw Device Tools

Thanks for your interest in contributing! This guide will help you get set up and understand our development workflow.

## Prerequisites

- **Node.js** >= 20
- **npm** (comes with Node.js)
- **Git**

## Getting Started

```bash
# Clone the repo
git clone https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools.git
cd capacitor-mobile-claw-device-tools

# Install dependencies
npm install

# Build
npm run build
```

## Project Structure

```
src/
  index.ts              # Package entry point — re-exports tools, types, categories
  types.ts              # DeviceTool interface definition
  categories.ts         # MCP tool category/section registry for Settings UI
  tools/
    index.ts            # Aggregates all tool arrays into allDeviceTools
    *.tools.ts          # One file per capability (e.g. ssh.tools.ts, camera.tools.ts)
plugins/
  capacitor-network-tools/  # Bundled Capacitor native plugin for network tools
    src/                    # TypeScript definitions
    android/                # Kotlin native code (SSH, TCP, UDP, HTTP, mDNS, WoL)
    ios/                    # Swift native code
```

Each `*.tools.ts` file exports an array of `DeviceTool` objects with:
- `name` — unique identifier (e.g. `ssh_connect`)
- `description` — human-readable purpose
- `inputSchema` — JSON Schema for parameters
- `execute` — async function implementation

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/esm/` |
| `npm run build:watch` | Compile in watch mode |
| `npm run lint` | Check code with Biome |
| `npm run lint:fix` | Auto-fix lint and format issues |
| `npm run typecheck` | Type-check without emitting |

## Making Changes

### 1. Create a branch

```bash
git checkout -b feat/my-feature
```

### 2. Make your changes

- Follow existing code conventions (TypeScript strict, ESM, single quotes, no semicolons)
- Biome handles formatting — run `npm run lint:fix` before committing

### 3. Add a changeset

If your change affects the published npm package, add a changeset:

```bash
npx changeset
```

This will prompt you to describe the change and select a semver bump (patch, minor, major). The changeset file is committed with your PR and used to generate changelog entries on release.

Skip this step for docs-only or CI-only changes.

### 4. Commit with a conventional message

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(tools): add Bluetooth heart rate monitor tool
fix(tools): handle missing camera permission gracefully
docs: update peer dependency table in README
chore(deps): update @capacitor/core to 8.2.0
```

Scopes: `tools`, `categories`, `docs`, `ci`, `deps`

### 5. Open a pull request

Push your branch and open a PR against `main`. The CI pipeline will run lint, typecheck, and build automatically.

## Adding a New Device Tool

1. **Create a new file** `src/tools/<capability>.tools.ts`
2. **Export a `DeviceTool[]` array** following the pattern in existing tool files
3. **Register the tools** in `src/tools/index.ts` — import and spread into `allDeviceTools`
4. **Add a category** in `src/categories.ts` — create a new `McpToolCategory` entry and add its `id` to the appropriate `McpCategorySection`
5. **Run checks**: `npm run lint:fix && npm run typecheck && npm run build`

## Code Style

We use [Biome](https://biomejs.dev/) for both linting and formatting. The config lives in `biome.json`. Key rules:
- 2 spaces, no tabs
- Single quotes
- No semicolons
- 120 character line width
- Trailing commas

Run `npm run lint:fix` to auto-fix most issues.

## Reporting Issues

- **Bugs**: Use the [bug report template](https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools/issues/new?template=bug_report.yml)
- **Features**: Use the [feature request template](https://github.com/rogelioRuiz/capacitor-mobile-claw-device-tools/issues/new?template=feature_request.yml)
- **Security**: See [SECURITY.md](SECURITY.md) — do NOT use public issues for vulnerabilities

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Please be respectful and constructive.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
