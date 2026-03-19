# Contributing to Piles

## Development Workflow

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Running the Application

```bash
# Start all three processes concurrently (main, renderer, electron)
npm run dev
```

This command starts:
1. **`npm run dev:main`** - Main process (Node.js/Electron), compiled by tsup
2. **`npm run dev:renderer`** - React app, bundled by Vite
3. **`npm run dev:electron`** - Electron app, waits for renderer and main to be ready

### Building

```bash
# Full build: typecheck + test + build renderer + build main
npm run build
```

```bash
# Build renderer only
npm run build:renderer

# Build main process only
npm run build:main
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run src/main/filesystem-service.test.ts
```

### Type Checking

```bash
npm run typecheck
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all three processes concurrently (main, renderer, electron) |
| `npm run dev:main` | Watch mode for main process (tsup) |
| `npm run dev:renderer` | Start Vite dev server |
| `npm run dev:electron` | Launch Electron app |
| `npm run build` | Full build: typecheck + test + build renderer + build main |
| `npm run build:main` | Build main process and preload |
| `npm run build:renderer` | Build React app for production |
| `npm run test` | Run vitest tests |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run storybook` | Start Storybook dev server (port 6006) |
| `npm run build-storybook` | Build static Storybook output |

---

## Environment Variables

### VITE_DEV_SERVER_URL

Used by the Electron main process to connect to the Vite dev server in development.

- **Format**: `http://localhost:5173`
- **Set by**: `npm run dev` automatically

### Storybook

```bash
# Start interactive component explorer
npm run storybook

# Build static Storybook (outputs to storybook-static/)
npm run build-storybook
```

Storybook opens at `http://localhost:6006`. Stories live alongside components as `*.stories.tsx` files.

---

## Architecture Overview

Piles is an Electron + React + TypeScript desktop application with three build processes:

1. **`src/main/`** — Node.js/Electron main process, compiled by `tsup` to `dist-electron/`. Handles all filesystem access, persistence, and IPC.
2. **`src/preload/`** — Electron preload script, also compiled by `tsup`. Bridges main ↔ renderer via `contextBridge`, exposing `window.piles`.
3. **`src/renderer/`** — React app, bundled by Vite. Runs in the browser context with no Node access.

**`src/shared/`** is imported by both main and preload — it must not contain any Electron or Node.js imports.

---

## Testing Procedures

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npx vitest

# Run specific test file
npx vitest run src/main/filesystem-service.test.ts
```

### Test Configuration

- Test framework: Vitest
- Test environment: Node.js
- Test patterns: `src/**/*.test.ts`
