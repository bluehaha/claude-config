---
name: clickup
description: Read ClickUp task content via the ClickUp API - retrieve a task's fields, description, checklists, and comments as JSON. Use when working with ClickUp task URLs or IDs.
---

# ClickUp

Read ClickUp task content via the API. Given a task URL or ID, retrieve the
task's fields (status, assignees, dates, priority, tags, custom fields), its
markdown description, embedded checklists and subtasks, plus all comments —
emitted as a single JSON object.

## Setup

1. In ClickUp, open **Settings → Apps**.
2. Under **API Token**, click **Generate** (or copy your existing token). It
   starts with `pk_`.
3. Copy `.env-example` to `.env` in this skill directory and paste the token:

```bash
cp ~/.claude/skills/clickup/.env-example ~/.claude/skills/clickup/.env
# Edit .env and add your token
```

The token inherits your own ClickUp permissions — you can read any task you can
see in the app. No per-task sharing step is required.

## Running Commands

```bash
node ~/.claude/skills/clickup/query.ts <command>
```

Requires **Node >= 22.18**, which runs TypeScript directly via native type
stripping. There is no build step and no dependencies to install.

### Commands

| Command | Description |
|---------|-------------|
| `get <url\|id>` | Retrieve a task (fields, description, checklists, subtasks) + its comments as JSON |

## Examples

```bash
# Team-scoped URL (custom task id + team_id, taken from the URL)
node ~/.claude/skills/clickup/query.ts get "https://app.clickup.com/t/3716037/86eyc0enm"

# Plain task URL — team_id comes from DEFAULT_TEAM_ID in .env
node ~/.claude/skills/clickup/query.ts get "https://app.clickup.com/t/86abc123"

# Bare id — same fallback
node ~/.claude/skills/clickup/query.ts get 86eyc0enm
```

## Supported URL / ID Formats

| Input | team_id source |
|-------|----------------|
| `https://app.clickup.com/t/3716037/86eyc0enm` | from URL (`3716037`) |
| `https://app.clickup.com/t/86abc123` | `DEFAULT_TEAM_ID` from `.env` |
| `86eyc0enm` | `DEFAULT_TEAM_ID` from `.env` |

**team_id resolution:** a team_id in the URL always wins; otherwise
`DEFAULT_TEAM_ID` from `.env` is used. Whenever a team_id is resolved, the task
is looked up with `custom_task_ids=true` — which also resolves native ids, so a
single setting covers both. If neither source supplies a team_id, the lookup is
a plain native-id lookup.

## Output Format

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

## When to Use

- **Understanding context**: read a ClickUp task, its checklist, and discussion
  before starting work.
- **Extracting content**: pull a task's description and comments into your
  terminal as structured JSON.

## Technical Notes

- Written in TypeScript and executed directly by Node's built-in type stripping,
  so the skill stays dependency-free (no `package.json`, no `node_modules`).
  Types are erased at load time and never type-checked at runtime — run `tsc`
  for that. `erasableSyntaxOnly` in `tsconfig.json` rejects any syntax Node
  cannot strip (enums, namespaces, parameter properties).
- Uses the ClickUp API v2 (`https://api.clickup.com/api/v2`).
- Auth is the personal token passed verbatim in the `Authorization` header
  (no `Bearer ` prefix).
- Custom task IDs require `custom_task_ids=true` plus the Workspace (`team_id`);
  the skill sets these automatically when a team_id is resolved.
- A 401 means the token is missing or invalid; a 404 usually means a custom id
  was used without the right `team_id` (or vice versa).
