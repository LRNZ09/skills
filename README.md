# skills

My agent skills, published as a source other tools fetch from. Skills are tracked
at `skills/<name>/SKILL.md`.

## Via Claude Code (plugin)

Packaged as a Claude Code plugin named `genius-skills` — after the Roman *genius*,
the attendant spirit that empowers an individual, which felt fitting for a personal
agent toolkit.

Add the marketplace, then install the plugin:

```sh
claude plugin marketplace add beautifoo/skills
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
npx skills@latest add beautifoo/skills/skills/<name>
# e.g.
npx skills@latest add beautifoo/skills/skills/council
```

## Via @sentry/dotagents

The `skills/<name>/SKILL.md` layout is what `@sentry/dotagents` discovers, so you
can fetch these into any project — or your `~/.agents` — without vendoring the
repo. Trust the repo first:

```sh
npx @sentry/dotagents trust add beautifoo/skills
```

This repo is also a plugin marketplace, so `add` installs it as the
`genius-skills` plugin rather than as single skills:

```sh
npx @sentry/dotagents add beautifoo/skills --all
```

For single skills, write the block into `agents.toml` by hand, then run
`npx @sentry/dotagents install`:

```toml
[[skills]]
name = "council"   # one skill; "*" for all of them
source = "beautifoo/skills"
```

`~/.agents` is managed by `@sentry/dotagents` — use its CLI, not copied files.
My personal config (the `agents.toml` that fetches these) lives in
[LRNZ09/dotconfigs](https://github.com/LRNZ09/dotconfigs), at
`configs/agents/agents.toml`.

## Skills

- `codename`
- `council`
- `prepare-sprint-demo-deck`
- `record-user-journey`

## Secret-leak guards

- `gitleaks`: `.githooks/pre-commit` scans staged changes. Enable it per
  clone with `git config core.hooksPath .githooks`; it skips with a warning
  when `gitleaks` is not installed. CI (`.github/workflows/gitleaks.yml`)
  scans every push and PR.
