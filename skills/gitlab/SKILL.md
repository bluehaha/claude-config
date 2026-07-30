---
name: gitlab
description: Interact with GitLab merge requests via the REST API - get MR details, diffs, comments, commits, and approvals, and post comments. Use when working with GitLab merge request URLs or IDs (including self-hosted instances).
---

# GitLab

Fetch and interact with GitLab **merge requests** via the REST API v4. Works with
self-hosted instances. Get MR details, diffs, comments, commits, and approval status;
post a comment.

## Setup

1. Copy `.env-example` to `.env` in this skill directory.
2. Set `GITLAB_HOST` (e.g. `https://gitlab.example.com`).
3. Add a Personal Access Token. Generate at **GitLab > User Settings > Access Tokens**.
   Scope `api` (needed to post comments) or `read_api` (read-only).

```bash
cp .claude/skills/gitlab/.env-example .claude/skills/gitlab/.env
# Edit .env: set GITLAB_HOST and GITLAB_TOKEN
```

No dependencies — uses Node 18+ built-in `fetch`.

## Running Commands

```bash
node ~/.claude/skills/gitlab/query.mjs <command> <url|id> [args] [--json]
```

| Command | Description |
|---------|-------------|
| `get <url\|id>` | MR details: title, state, author, branches, description |
| `diff <url\|id>` | Changed files and diffs |
| `comments <url\|id>` | List comments (notes); system events hidden |
| `commit-list <url\|id>` | Commits in the MR |
| `approvals <url\|id>` | Approval status |
| `comment <url\|id> "msg"` | Post a comment on the MR (write; needs `api` scope) |
| `me` | Show the token's user (sanity-check auth) |

Flag: `--json` outputs the raw API response.

## Reference / URL Formats

The `<url|id>` argument accepts any of:

- **Full URL:** `https://gitlab.example.com/mygroup/myrepo/-/merge_requests/4230`
  (nested group paths work: `.../group/subgroup/project/-/merge_requests/12`)
- **Shorthand:** `mygroup/myrepo!4230` (uses `GITLAB_HOST`)
- **Bare iid:** `4230` (requires `GITLAB_DEFAULT_PROJECT` in `.env`)

## Examples

```bash
# MR details from a full URL
node .claude/skills/gitlab/query.mjs get "https://gitlab.example.com/mygroup/myrepo/-/merge_requests/4230"

# Shorthand
node .claude/skills/gitlab/query.mjs get mygroup/myrepo!4230

# Diffs, comments, commits, approvals
node .claude/skills/gitlab/query.mjs diff mygroup/myrepo!4230
node .claude/skills/gitlab/query.mjs comments mygroup/myrepo!4230
node .claude/skills/gitlab/query.mjs commit-list mygroup/myrepo!4230
node .claude/skills/gitlab/query.mjs approvals mygroup/myrepo!4230

# Post a comment
node .claude/skills/gitlab/query.mjs comment mygroup/myrepo!4230 "LGTM, merging after CI."

# Raw JSON (for scripting / piping to jq)
node .claude/skills/gitlab/query.mjs get mygroup/myrepo!4230 --json

# Verify the token
node .claude/skills/gitlab/query.mjs me
```

## Output Format

### MR Details (`get`)

```
MR !4230: Add dark mode toggle
State: opened
Author: Jane Smith
Source: feature/dark-mode  →  Target: main
Reviewers: John Doe
Labels: frontend, needs-review
Merge status: mergeable
Created: 2026-07-28 09:14:02 UTC  Updated: 2026-07-29 16:40:11 UTC
URL: https://gitlab.example.com/mygroup/myrepo/-/merge_requests/4230

Description:
Adds a dark mode toggle to the settings page...
```

### Comments (`comments`)

```
[2026-07-28 10:30:00 UTC] John Doe (note 91011):
  Looks good. One nit on the color variables.

Total: 1 comment(s) (3 system events hidden)
```

## Auth Notes

- Header used: `PRIVATE-TOKEN`.
- Project is addressed by URL-encoded path (`mygroup/myrepo` → `mygroup%2Fmyrepo`); no numeric
  project ID lookup needed.
- `diff` calls `/diffs` (GitLab 15.7+) and falls back to `/changes` on older servers.
- `401` → token missing/expired; `403` → token scope too narrow; `404` → wrong
  path/iid/host. The CLI prints a hint for each.

## When to Use

- **Reviewing an MR**: `get` + `diff` + `comments` to understand a change before working on it.
- **Context gathering**: pull MR description and discussion into the conversation.
- **Status checks**: `approvals` and `commit-list`.
- **Collaboration**: `comment` to post an update or review note.
