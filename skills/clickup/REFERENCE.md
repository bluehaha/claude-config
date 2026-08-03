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

A JSON object with two top-level keys, `task` and `comments`. Output is
**condensed by default**; pass `--raw` for the unmodified API response.

```json
{
  "task": {
    "id": "86ey1pnqu",
    "name": "Task title",
    "url": "https://app.clickup.com/t/...",
    "status": "in progress",
    "priority": "normal",
    "description": "The description rendered as markdown",
    "assignees": ["Anny Wei"],
    "creator": "Anny Wei",
    "list": "2026 7-8-9",
    "date_updated": "2026-08-03T02:06:07.347Z",
    "custom_fields": { "Sprint #": "78", "類型": ["GA"] },
    "checklists": [ { "name": "...", "items": [ ... ] } ],
    "subtasks": [
      { "id": "...", "name": "後端", "status": "進行中", "assignees": ["..."] }
    ],
    "attachments": [ { "title": "...", "url": "...", "size": 20866 } ]
  },
  "comments": [
    { "id": "...", "user": "pauleanr", "date": "2026-07-20T07:37:43.801Z", "text": "review" }
  ]
}
```

Keys that are null, empty, or absent upstream are omitted entirely, so a small
task produces a small object.

### What condensing does

The raw response for a typical task is ~96KB, of which ~96% is metadata. The
condenser cuts it to ~4KB without losing content:

| Change | Why |
|---|---|
| Subtasks reduced to `id`, `name`, `status`, `assignees`, `priority`, `due_date` | The API returns a **full task object** per subtask (~35KB). Fetch a subtask by id when you need its description or comments. |
| Unset custom fields dropped; the rest flattened to `name -> value` | Most fields have no value; each still ships its full `type_config` option list. |
| `labels` / `drop_down` values resolved to their display text | The stored value is an option id or index — `類型: ["009bf52c-…"]` becomes `類型: ["GA"]`. |
| One description kept | `description`, `text_content` and `markdown_description` hold the same prose three ways. Markdown wins. |
| Attachments reduced to `title` + one `url` | Each carries 7 near-identical signed URLs and thumbnail variants. |
| Users reduced to a username string | Each embedded user object carries email, colour, initials and a profile-picture URL. |
| Comments keep `comment_text` as `text` | Text is stored twice — as a rich-text block array and flat. Blocks are joined as a fallback when the flat field is missing. |
| Epoch-ms timestamps rendered as ISO-8601 | Readable without conversion. |

Use `--raw` when you need a field the condenser drops — status colours, user
ids and emails, `orderindex`, per-subtask custom fields, or thumbnail URLs.

- The description is requested as markdown (`include_markdown_description=true`),
  so under `--raw` it appears as `task.markdown_description`.
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
| `scripts/commands/get.ts` | `get` command — fetch, condense (unless `--raw`), print |
| `scripts/commands/usage.ts` | CLI usage text |
| `scripts/lib/parse.ts` | Normalizes URLs and bare ids into `{ taskId, teamId }` |
| `scripts/lib/condense.ts` | Reduces the raw API response to the fields worth reading |
| `scripts/types.ts` | Shared response types (raw + condensed) |
| `scripts/tsconfig.json` | Type-check config (no emit) |
| `scripts/.env-example` | Template for `scripts/.env` |

Written in TypeScript and executed directly by Node's built-in type stripping,
so the skill stays dependency-free (no `package.json`, no `node_modules`).
Types are erased at load time and never type-checked at runtime — run `tsc` for
that. `erasableSyntaxOnly` in `tsconfig.json` rejects any syntax Node cannot
strip (enums, namespaces, parameter properties).
