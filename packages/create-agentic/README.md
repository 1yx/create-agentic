# create-agentic

Scaffold a new project with agentic best practices — sensible defaults, a strong ESLint baseline, [OpenSpec](https://github.com/OpenSpec-dev) change-tracking, and git ready out of the box.

Built on `pnpm`. Ships templates for TypeScript libraries and Obsidian plugins today; a Next.js template is on the way.

## Usage

```bash
# Interactive — prompts for the directory
pnpm create agentic

# Or directly
pnpm create agentic my-app
npm create agentic my-app
npx create-agentic my-app
```

Then:

```bash
cd my-app
pnpm dev
```

## Templates

| Name             | Flag                  | Stack                                                        |
| ---------------- | --------------------- | ------------------------------------------------------------ |
| `typescript`     | `-t typescript` (default) | TS library: ESLint + Prettier + Vitest                    |
| `obsidian-plugin`| `-t obsidian-plugin`  | Obsidian plugin: esbuild + eslint-plugin-obsidianmd         |

## Options

| Flag / arg         | Default     | Description                                              |
| ------------------ | ----------- | ------------------------------------------------------- |
| `[dir]`            | — (prompted)| Project directory name or path                          |
| `-t, --template`   | `typescript`| Template to use                                          |
| `-f, --force`      | `false`     | Overwrite an existing directory                         |
| `--no-install`     | `true`      | Skip `pnpm install` after scaffolding                    |
| `--no-git`         | `true`      | Skip git init + initial commit                          |
| `--no-openspec`    | `true`      | Skip `openspec init`                                    |

Flags use the `--no-*` form to disable a step that runs by default.

## What it does

1. Copies the chosen template into the target directory.
2. Replaces `{{placeholders}}` in the copied files. `{{project-name}}` is filled from the directory name; any others are prompted interactively.
3. Installs dependencies with `pnpm`.
4. Initializes git and makes the initial commit.
5. Runs `openspec init` to set up change-tracking.

Each step is optional via the flags above.

## Requirements

- Node.js >= 20
- `pnpm`
- `git` (unless `--no-git`)
- `npx` (for `openspec init`, unless `--no-openspec`)

## Development

This package lives in a pnpm workspace. Clone the repo and:

```bash
pnpm install
pnpm --filter create-agentic dev    # run the CLI via tsx
pnpm --filter create-agentic build  # unbuild + copy templates into dist/
pnpm --filter create-agentic lint
```

Templates are plain directories under [`packages/templates/`](../templates). To add one, drop in a new folder — the CLI auto-discovers it via `readdirSync`. Files listed in `src/utils/replace-placeholder.ts` (`AGENTS.md`, `eslint.config.*`, etc.) are copied verbatim; everything else is scanned for `{{placeholders}}`.

## License

MIT
