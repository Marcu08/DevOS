# Security Policy

## Supported versions

Security fixes are applied to the current `main` branch and the latest 2.x release.

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use GitHub's private
vulnerability reporting (Security → Advisories) for this repository, or contact the
maintainer directly.

Include:

- The affected version or commit.
- Reproduction steps.
- Impact and any known mitigations.
- Whether secrets or user data may have been exposed.

## Security model

DevOS is a developer tool that generates and executes code. It is not a sandbox for
untrusted code.

- Pipeline changes are applied to the Git-managed `workspace/` copy, not directly to
  your main working tree.
- `sandbox` creates an isolated copy for comparison.
- Validation commands and generated code run with the privileges of your user.
- Review diffs before merging generated changes.
- Prefer `safe` or `assisted` mode on untrusted repositories.

## Secrets

- API keys are read from environment variables or a gitignored `.env`.
- Do not commit `.env`, credentials, tokens, or private keys.
- Do not paste secrets into issues, pull requests, logs, or screenshots.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to a browser or client bundle.
- Cache and log files may contain repository content; treat them as sensitive.

## Dependencies

Runtime dependencies are intentionally minimal. Run:

```bash
npm audit --omit=dev
```

to audit production dependencies. Development-only advisories are reported
separately and should be triaged before a release.
