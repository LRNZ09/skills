---
name: generate-pull-request-description
description: Generate a PR description that includes a summary and test plan. Use this when the user requests it explicitly or when all work on the branch has been finalized.
---

# Generate Pull Request Description

Generate a PR description with summary and test plan, based on all commits and diffs since the last common ancestor with the base branch.

## Gather Context

Run these in parallel:

1. `git status` — check for uncommitted changes
2. `git branch --show-current` — current branch name
3. `git log --oneline development..HEAD` — all commits on this branch
4. `git diff development...HEAD --stat` — changed files summary
5. `git diff development...HEAD` — full diff for analysis

If there are uncommitted changes, warn the user before proceeding.

Detect the base branch: unless the user specifies otherwise, use `init.defaultBranch` if it's set and exists, otherwise use `main`.

## Generate Description

Analyze ALL commits and the full diff (not just the latest commit). Draft:

```markdown
## Summary

Briefly describe the changes made in this PR, including the motivation and context. Then:

- <1-3 bullet points explaining what changed and why>

## Test Plan
- <concrete verification steps someone can follow>
- <cover happy path and edge cases>

## Notes
- <any additional context or information for reviewers>
```

**Title:** Under 70 characters. Use the Jira ticket ID prefix if the branch name contains one (e.g., `PROJECTID-12345: Fix yet another bug`).

Present the title and description to the user for review before opening the browser.
