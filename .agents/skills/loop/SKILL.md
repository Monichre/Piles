---
name: loop
description: Run the closed loop — plan, execute, verify, iterate until the goal is done, then ship a PR for review
---

Run the closed development loop for this app until the goal in `GOAL.md` is met.

## 1. Read

- Read `GOAL.md`. If there is no objective or done condition, stop and tell the user to run `/goal` first.
- Require a clean working tree (`git status --porcelain`). If dirty, stop and report.

## 2. Plan

- Break the objective into the smallest set of changes that can satisfy the done condition.
- Create a branch: `agent/loop-<YYYYMMDD>-<slug>`.

## 3. Execute

- Implement the changes. Follow this app's `AGENTS.md` / `CLAUDE.md` conventions.
- Small, surgical diffs. No rewrites unless the objective demands it.

## 4. Verify

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npx playwright test`

Then answer honestly: does the output actually satisfy the done condition in `GOAL.md`?

## 5. Iterate

- If verification fails: fix, re-verify. Cap at 3 rounds.
- If still failing after 3 rounds: stop, report what is blocked, leave the branch in place.
- Never delete, skip, weaken, or narrow tests or verification to make it pass.

## 6. Ship

- Append a row to `GOAL.md`'s Progress table.
- Commit with a message explaining *why*, not just what.
- If an `origin` remote exists: push the branch and open a PR (`gh pr create`) with the objective, what changed, verification results, and done-condition status.
- If no remote: leave the local branch, report the name and summary.

## Hard rules

- Never commit to the default branch.
- Never force-push or rewrite history.
- Never touch files outside this app's directory.
- If anything irreversible would be required, stop and ask the human.
