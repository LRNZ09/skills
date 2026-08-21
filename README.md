# skills

My agent skills, published as a source other tools fetch from. Skills are tracked
at `skills/<name>/SKILL.md`.

## Via Claude Code (plugin)

Packaged as a Claude Code plugin named `genius-skills` — after the Roman *genius*,
the attendant spirit that empowers an individual, which felt fitting for a personal
agent toolkit.

Add the marketplace, then install the plugin:

```sh
claude plugin marketplace add LRNZ09/skills
claude plugin install genius-skills@genius-skills
```

Or run `/plugin` to open the plugin manager. Restart Claude Code after installing —
skills activate automatically when relevant.

**Updating:**

```sh
claude plugin marketplace update
claude plugin update genius-skills@genius-skills
```

## Via the `skills` CLI

```sh
npx skills@latest add LRNZ09/skills/skills/<name>
# e.g.
npx skills@latest add LRNZ09/skills/skills/commit-series
```

## Via @sentry/dotagents

The `skills/<name>/SKILL.md` layout is what `@sentry/dotagents` discovers, so you
can fetch these into any project — or your `~/.agents` — without vendoring the
repo. Trust the org, then add the skills you want:

```sh
npx @sentry/dotagents trust add LRNZ09
npx @sentry/dotagents add LRNZ09/skills commit-series   # one skill
npx @sentry/dotagents add LRNZ09/skills --all           # all of them
```

`~/.agents` is managed entirely by `@sentry/dotagents` — never edit it by hand.
My personal config (the `agents.toml` that fetches these) lives in
[LRNZ09/dotagents](https://github.com/LRNZ09/dotagents).

## Skills

Authored by me: `codename`, `council`.

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT —
see [NOTICE](./NOTICE)): `caveman`, `diagnose`, `grill`, `handoff`,
`improve-codebase-architecture`, `prototype`, `tdd`, `triage`.

## Secret-leak guards

- Pre-commit hook (`.githooks/pre-commit`) runs `gitleaks` on staged changes.
  Enable per clone: `git config core.hooksPath .githooks` (needs `gitleaks`).
- CI (`.github/workflows/gitleaks.yml`) scans every push and PR.
