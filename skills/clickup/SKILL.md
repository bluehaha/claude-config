---
name: ClickUp
description: Read ClickUp task content via the ClickUp API - retrieve a task's fields, description, checklists, and comments as JSON. Use when working with ClickUp task URLs or IDs.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/query.ts:*)
---

# ClickUp

Read ClickUp task content via the API. Given a task URL or ID, retrieve the
task's fields (status, assignees, dates, priority, tags, custom fields), its
markdown description, embedded checklists and subtasks, plus all comments —
emitted as a single JSON object.

## Usage

```bash
node ~/.claude/skills/clickup/scripts/query.ts get <url|id> [--raw]
```

Examples:

```bash
# Team-scoped URL (custom task id + team_id, taken from the URL)
node ~/.claude/skills/clickup/scripts/query.ts get "https://app.clickup.com/t/3716037/86eyc0enm"

# Plain task URL or bare id — team_id comes from DEFAULT_TEAM_ID in .env
node ~/.claude/skills/clickup/scripts/query.ts get "https://app.clickup.com/t/86abc123"
node ~/.claude/skills/clickup/scripts/query.ts get 86eyc0enm
```

Both a task URL and a bare id are accepted. Pass the URL when you have it — a
team-scoped URL carries the `team_id` needed to resolve custom task ids.

## Output

Condensed by default — the default output drops that scaffolding, flattens custom fields to `name -> value`,
and resolves label/dropdown ids to their display text.

```bash
# Full unmodified API response — status colours, user ids/emails, orderindex,
# per-subtask custom fields, thumbnail URLs
node ~/.claude/skills/clickup/scripts/query.ts get 86eyc0enm --raw
```

Prefer the default; reach for `--raw` only when you need a field it omits. See
[REFERENCE.md](REFERENCE.md#output-format) for the exact schema and cut list.

## When to use

- **Understanding context**: read a ClickUp task, its checklist, and discussion
  before starting work.
- **Extracting content**: pull a task's description and comments into your
  terminal as structured JSON.

## More

- **First-time setup** (API token, `.env`, Node version): see [SETUP.md](SETUP.md)
- **URL/ID formats, team_id resolution, output schema, API details**: see [REFERENCE.md](REFERENCE.md)
