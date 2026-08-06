# GitLab Skill Reference

## Contents

- Supported URL / ID formats
- Host and project resolution
- Output format
- API notes
- Implementation notes

## Supported URL / ID formats

The `<url|id>` argument accepts any of:

| Input | Host source | Project source |
|-------|-------------|----------------|
| `https://gitlab.example.com/mygroup/myrepo/-/merge_requests/4230` | from URL | from URL |
| `mygroup/myrepo!4230` | `GITLAB_HOST` | from the argument |
| `4230` | `GITLAB_HOST` | `GITLAB_DEFAULT_PROJECT` |

Nested group paths work in both the URL and shorthand forms —
`https://gitlab.example.com/group/subgroup/project/-/merge_requests/12` and
`group/subgroup/project!12` both resolve.

## Host and project resolution

A full URL is self-contained: the host comes from the URL itself, so the skill
reaches the right instance with no configuration. This is what makes it work
against several self-hosted GitLabs at once.

The other two forms fall back to `GITLAB_HOST` from `.env`. A bare iid
additionally needs `GITLAB_DEFAULT_PROJECT`, since nothing in `4230` identifies a
project.

Real environment variables win over `.env` — including one set to an empty
string, which is treated as an explicit "unset this" rather than falling back.

Everything before the `/-/merge_requests/` marker is taken as the project path,
which is why arbitrarily nested groups parse correctly.

## Output format

Human-readable text by default; `--json` prints the unmodified API response.

### MR details (`get`)

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

`Merge status` prefers `detailed_merge_status` (GitLab 15.6+) over the older
`merge_status`. It is computed asynchronously server-side, so an MR fetched
immediately after a push may report `checking` and settle to `mergeable` a
moment later.

Assignees, reviewers, and labels lines are omitted when empty. A draft MR shows
`State: opened (draft)`.

### Comments (`comments`)

```
[2026-07-28 10:30:00 UTC] John Doe (note 91011):
  Looks good. One nit on the color variables.

Total: 1 comment(s) (3 system events hidden)
```

System notes — "added label", "assigned to", and similar events — are filtered
out of the text output, and the trailing count says how many were hidden. They
are still present under `--json`, which returns the notes list unfiltered.

### Diffs (`diff`)

```
--- src/theme.ts [new]
@@ -0,0 +1,12 @@
+export const themes = {
...

Total: 3 file(s) changed
```

Each file is tagged `[new]`, `[deleted]`, or `[renamed]` where applicable.

### Other commands

`commit-list` prints `short_id`, title, author and date per commit with a total.
`approvals` prints how many approvals of the required number are in, who
approved, and how many are left. `me` prints the token's user as
`name (@username)  id=N  email`.

Timestamps are rendered from ISO 8601 into a compact, locale-independent
`YYYY-MM-DD HH:MM:SS UTC`.

## API notes

- Uses the GitLab REST API v4 (`{host}/api/v4`).
- Auth is the personal access token in the `PRIVATE-TOKEN` header.
- Projects are addressed by URL-encoded path (`mygroup/myrepo` →
  `mygroup%2Fmyrepo`), so no numeric project ID lookup is needed.
- `diff` calls `/diffs` (GitLab 15.7+) and falls back to `/changes` on a 404 from
  older servers. The two differ in shape — `/diffs` returns a bare array,
  `/changes` wraps it in `{ changes: [...] }` — and both are handled.
- List endpoints request `per_page: 100`; MRs with more notes or commits than
  that are truncated at one page.
- `comment` is the only write command and needs the `api` scope.
- `401` → token missing/expired; `403` → token scope too narrow; `404` → wrong
  path/iid/host. The CLI prints a hint for each.

## Implementation notes

Layout under `scripts/`:

| Path | Role |
|------|------|
| `scripts/query.ts` | CLI entry point — arg parsing, command dispatch, error handling |
| `scripts/api/client.ts` | HTTP layer, `.env` loading, auth, error hints |
| `scripts/api/merge-requests.ts` | MR endpoints: details, diffs (with fallback), commits, approvals |
| `scripts/api/notes.ts` | Note endpoints: list and post |
| `scripts/api/user.ts` | `GET /user` for the `me` command |
| `scripts/commands/*.ts` | One file per command — `get`, `diff`, `comments`, `commit-list`, `approvals`, `comment`, `me` |
| `scripts/commands/output.ts` | Shared stdout helper: formatted text vs. `--json` |
| `scripts/commands/usage.ts` | CLI usage text |
| `scripts/lib/parse.ts` | Normalizes URLs, shorthand, and bare iids into `{ host, projectPath, iid }` |
| `scripts/lib/format.ts` | Text renderers for each response type |
| `scripts/types.ts` | Shared GitLab API v4 response types |
| `scripts/tsconfig.json` | Type-check config (no emit) |
| `scripts/.env-example` | Template for `scripts/.env` |

Written in TypeScript and executed directly by Node's built-in type stripping,
so the skill stays dependency-free — the only `package.json` entry is the
`@types/node` devDependency used at type-check time, plus the `"type": "module"`
marker. Types are erased at load time and never type-checked at runtime — run
`tsc` for that. `erasableSyntaxOnly` in `tsconfig.json` rejects any syntax Node
cannot strip (enums, namespaces, parameter properties).
