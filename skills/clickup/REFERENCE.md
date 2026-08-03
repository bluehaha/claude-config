# ClickUp Skill Reference

## Contents

- Supported URL / ID formats
- team_id resolution
- Output format
- API notes
- Implementation notes

## Supported URL / ID formats

| Input | team_id source |
|-------|----------------|
| `https://app.clickup.com/t/3716037/86eyc0enm` | from URL (`3716037`) |
| `https://app.clickup.com/t/86abc123` | `DEFAULT_TEAM_ID` from `.env` |
| `86eyc0enm` | `DEFAULT_TEAM_ID` from `.env` |

## team_id resolution

A team_id in the URL always wins; otherwise `DEFAULT_TEAM_ID` from `.env` is
used. Whenever a team_id is resolved, the task is looked up with
`custom_task_ids=true` — which also resolves native ids, so a single setting
covers both. If neither source supplies a team_id, the lookup is a plain
native-id lookup.

This is why a `404` most often means a custom id was used without the right
`team_id` (or vice versa) rather than a genuinely missing task.

## Output format

A JSON object with two top-level keys:

```json
{
  "task": {
    "id": "...",
    "name": "Task title",
    "status": { "status": "in progress", "color": "..." },
    "markdown_description": "The description rendered as markdown",
    "assignees": [ ... ],
    "checklists": [ { "name": "...", "items": [ ... ] } ],
    "subtasks": [ ... ],
    "custom_fields": [ ... ],
    "url": "https://app.clickup.com/t/..."
  },
  "comments": [
    { "id": "...", "comment_text": "...", "user": { ... }, "date": "..." }
  ]
}
```

- The description is requested as markdown (`include_markdown_description=true`),
  so it appears under `task.markdown_description`.
- Checklists and subtasks are embedded in the task response — no extra calls.
- Comments are fetched separately and paginated to completion.

## API notes

- Uses the ClickUp API v2 (`https://api.clickup.com/api/v2`).
- Auth is the personal token passed verbatim in the `Authorization` header
  (no `Bearer ` prefix).
- Custom task IDs require `custom_task_ids=true` plus the Workspace (`team_id`);
  the skill sets these automatically when a team_id is resolved.
- Comments come back 25 per page, newest first. Older pages are requested with
  `start` (the last comment's `date`) and `start_id` (its `id`), followed until
  a page returns fewer than 25.

## Implementation notes

Layout under `scripts/`:

| Path | Role |
|------|------|
| `scripts/query.ts` | CLI entry point — arg parsing, command dispatch, JSON output |
| `scripts/api/client.ts` | HTTP layer, `.env` loading, auth, error hints |
| `scripts/api/tasks.ts` | `GET /task/{id}` with markdown description + subtasks |
| `scripts/api/comments.ts` | `GET /task/{id}/comment`, paginated to completion |
| `scripts/lib/parse.ts` | Normalizes URLs and bare ids into `{ taskId, teamId }` |
| `scripts/types.ts` | Shared response types |
| `scripts/tsconfig.json` | Type-check config (no emit) |
| `scripts/.env-example` | Template for `scripts/.env` |

Written in TypeScript and executed directly by Node's built-in type stripping,
so the skill stays dependency-free (no `package.json`, no `node_modules`).
Types are erased at load time and never type-checked at runtime — run `tsc` for
that. `erasableSyntaxOnly` in `tsconfig.json` rejects any syntax Node cannot
strip (enums, namespaces, parameter properties).
