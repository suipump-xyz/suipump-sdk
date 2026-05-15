# Contributing to @suipump/sdk

## Setup

```bash
git clone https://github.com/suipump-xyz/suipump-sdk.git
cd suipump-sdk
npm install
npm run build
npm test
```

## Branch Naming

- `feature/*` — new functionality
- `fix/*` — bug fixes
- `docs/*` — documentation only
- `infra/*` — CI, tooling, config

## PR Checklist

Before submitting a pull request:

- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type-check passes (`npm run typecheck`)
- [ ] Build passes (`npm run build`)
- [ ] Typed exports are documented in `src/types.ts`
- [ ] Examples updated if public API changed
- [ ] Changeset added if behavior changed

## Commit Style

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

## Questions

Open a GitHub Discussion or reach out to `security@suipump.dev` for sensitive issues.
