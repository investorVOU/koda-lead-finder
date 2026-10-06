# Revert the choose-plan redesign

This note explains how to undo the temporary single-plan / Starter-only change without affecting the real billing backend or database records.

## Safe revert for the UI only

If you want to restore the old multi-plan page layout and plan selection UI, run:

```bash
git restore src/routes/_authenticated/choose-plan.tsx
```

If you also want to restore the previous pricing values used by the old plan cards, run:

```bash
git restore src/lib/billing.ts
```

These commands only revert the frontend code. They do not remove any saved plan rows, Paystack configuration, or backend billing records.

## Revert a full commit

If the redesign was committed, revert the commit instead:

```bash
git revert <commit-hash>
```

## Revert to the branch state before the edit

If you want to discard everything on the current feature branch and return to the state from the last commit:

```bash
git reset --hard HEAD
```

Use this carefully because it removes uncommitted changes as well.

## Important safety note

Do not delete or alter the actual subscription plan records in the database unless you truly intend to remove the backend billing setup. The design brief specifically said to hide the extra plans from the page while leaving them in the backend for possible restoration later.

## Useful commands

```bash
git status
git branch --show-current
git log --oneline -n 5
```

## Branch reminder

The redesign work should stay on a feature branch such as:

```bash
git checkout feat/visitor-telegram
```

This keeps it isolated from the main branch.
