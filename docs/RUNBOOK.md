# Piles Runbook

## Development vs Production Modes

### Development Mode
```bash
npm run dev
```
Starts all three processes with hot-reload enabled. Main process connects to Vite dev server at `http://localhost:5173`.

### Production Build
```bash
npm run build
```
Generates production builds in `dist/` (renderer) and `dist-electron/` (main process).

---

## Common Issues and Fixes

### Electron fails to start

**Symptom**: `npm run dev` exits with connection error

**Solution**:
1. Kill any remaining Electron processes: `pkill -f electron`
2. Clear the cache: `rm -rf node_modules/.vite dist-electron`
3. Rebuild: `npm run build`

### Port already in use (5173)

**Symptom**: `Error: listen EADDRINUSE: address already in use :::5173`

**Solution**:
```bash
lsof -i :5173  # Find the process using the port
kill -9 <PID>  # Terminate it
```

### Type errors after pulling updates

**Symptom**: `npm run typecheck` fails

**Solution**:
```bash
npm install  # Ensure dependencies are up to date
npm run typecheck
```

### Tests fail intermittently

**Symptom**: Flaky vitest results

**Solution**:
- Ensure file watchers are not conflicting
- Run tests in isolation: `npx vitest run --reporter=verbose`

### Main process crashes on startup

**Symptom**: Electron window doesn't appear

**Solution**:
1. Check `dist-electron/` exists
2. Rebuild main process: `npm run build:main`
3. Run Electron directly to see errors:
   ```bash
   npx electron .
   ```

---

## Build Artifacts

| Directory | Contents |
|----------|----------|
| `dist/` | Production renderer build (React app) |
| `dist-electron/` | Main process and preload builds |

To clean and rebuild:
```bash
rm -rf dist dist-electron
npm run build
```

---

## Rollback Procedures

If a build introduces issues:

1. **Revert to last working commit**:
   ```bash
   git log --oneline -10  # Find last good commit
   git checkout <commit-hash>
   npm run build
   ```

2. **Reinstall dependencies** (if issues began after package changes):
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

---

## Deployment

Piles is a desktop application distributed as source code. To "deploy":

1. Ensure production build succeeds:
   ```bash
   npm run build
   ```

2. Package using Electron Builder (future enhancement):
   ```bash
   npx electron-builder --mac
   ```

---

## Logging and Diagnostics

### Main Process Logs
Electron main process logs are written to the system console. For detailed debugging:

1. Open DevTools in Electron: `Cmd+Option+I`
2. Check the **Console** tab for JavaScript errors
3. Check the **Terminal** where `npm run dev` is running for main process errors

### Renderer Process Logs
Browser console (DevTools) captures React and renderer errors.

---

## Health Checks

### Verify Development Environment

```bash
# 1. Type checking passes
npm run typecheck

# 2. Tests pass
npm test

# 3. All builds succeed
npm run build
```

### Verify Electron Starts

```bash
# Start dev server in one terminal
npm run dev:renderer

# In another terminal, start Electron
npm run dev:electron

# Verify window appears and no console errors
```

---

## Troubleshooting Checklist

- [ ] Node.js version >= 20
- [ ] `npm install` completed without errors
- [ ] `dist-electron/` directory exists with main.js
- [ ] No port conflicts (5173)
- [ ] TypeScript compiles without errors
- [ ] All tests pass
