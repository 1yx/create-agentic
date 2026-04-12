# {{project-name}}

A TypeScript project with pnpm, ESLint, Prettier, and Vitest.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

## Scripts

- `pnpm dev` - Run the application in development mode
- `pnpm build` - Build the project
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm typecheck` - Run TypeScript type checking

## Project Structure

```
├── src/
│   └── index.ts          # Main entry point
├── tests/
│   └── unit/
│       └── example.test.ts  # Example test
├── dist/                 # Build output (gitignored)
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── .prettierrc.json5
├── vitest.config.ts
├── .editorconfig
└── .gitignore
```
