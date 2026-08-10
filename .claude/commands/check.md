# /check — Run quality checks

Run all quality gates for Piles. All must pass before considering a task done.

## Steps

1. `npm run typecheck` — TypeScript must be clean
2. `npm test` — all vitest tests must pass
3. Report results: green = proceed, red = fix before moving on

## Fix Loop

If checks fail:
1. Read the error output carefully
2. Fix the root cause (not just the symptom)
3. Re-run `/check`
4. Max 2 fix cycles before escalating to user
