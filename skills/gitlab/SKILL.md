---
name: gitlab
description: Interact with GitLab merge requests via the REST API - get MR details, diffs, comments, commits, and approvals, and post comments. Use when working with GitLab merge request URLs or IDs (including self-hosted instances).
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/query.ts:*)
---

# GitLab

Interact with GitLab **merge requests** via the REST API v4. Given an MR URL or
id, read its details, diffs, comments, commits, and approval status — or post a
comment. Works with self-hosted instances.

## Usage

```bash
node ~/.claude/skills/gitlab/scripts/query.ts <command> <url|id> [args] [--json]
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

Examples:

```bash
# Full URL — carries its own host, so it works against any instance
node ~/.claude/skills/gitlab/scripts/query.ts get "https://gitlab.example.com/mygroup/myrepo/-/merge_requests/4230"

# Shorthand (uses GITLAB_HOST) and bare iid (needs GITLAB_DEFAULT_PROJECT)
node ~/.claude/skills/gitlab/scripts/query.ts diff mygroup/myrepo!4230
node ~/.claude/skills/gitlab/scripts/query.ts comments 4230

# Post a comment
node ~/.claude/skills/gitlab/scripts/query.ts comment mygroup/myrepo!4230 "LGTM, merging after CI."
```

All three reference forms are accepted everywhere. Pass the full URL when you
have it — it carries the host, so no configuration is needed to resolve it.

## Output

Human-readable text by default. Pass `--json` for the raw API response, for
scripting or piping to `jq`:

```bash
node ~/.claude/skills/gitlab/scripts/query.ts get mygroup/myrepo!4230 --json
```

See [REFERENCE.md](REFERENCE.md#output-format) for samples of each command's output.

## When to use

- **Reviewing an MR**: `get` + `diff` + `comments` to understand a change before
  working on it.
- **Context gathering**: pull an MR's description and discussion into the
  conversation.
- **Status checks**: `approvals` and `commit-list`.
- **Collaboration**: `comment` to post an update or review note.

## More

- **First-time setup** (access token, `.env`, Node version): see [SETUP.md](SETUP.md)
- **URL/ID formats, host resolution, output samples, API details**: see [REFERENCE.md](REFERENCE.md)
