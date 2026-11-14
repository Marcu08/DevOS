# Contributing to DevOS

## Setup

```bash
npm ci
node cli.js doctor
node cli.js setup    # optional: configure AI/GitHub/Supabase credentials
```

## Checks before opening a pull request

```bash
npm test
npm run test:coverage
npm run lint
npm run bench -- --check
```

`npm test` runs the custom suites in `tests/`. See
[`tests/README.md`](tests/README.md) for the assertion API and runner flags.

## Guidelines

- Keep changes scoped. Do not mix refactors with behavior changes.
- Add or update tests for every behavior change.
- Update `README.md` and `CHANGELOG.md` when user-facing behavior changes.
- Do not commit `.env`, `workspace/`, `logs/`, `coverage/`, or `sandbox/`.
- Prefer Node APIs for new code. Windows `.ps1` helpers must stay PowerShell 7
  compatible.
- Keep the CLI startup fast: avoid loading heavy modules at command-registration
  time; add the handler require inside the command function.
- Document new environment variables in `README.md` and `.env.example`.

## Pull requests

Describe:

1. The problem and root cause.
2. The change and why it is minimal.
3. The verification commands you ran and their results.
4. Any remaining concerns or follow-up work.

## License

By contributing, you agree that your changes are licensed under the MIT License.
