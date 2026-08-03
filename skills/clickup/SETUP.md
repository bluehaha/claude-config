# ClickUp Skill Setup

One-time setup: a personal API token in `.env`, and Node >= 22.18.

## API token

1. In ClickUp, open **Settings → Apps**.
2. Under **API Token**, click **Generate** (or copy your existing token). It
   starts with `pk_`.
3. Copy `.env-example` to `.env` and paste the token:

```bash
cd ~/.claude/skills/clickup/scripts
cp .env-example .env
# Edit .env and add your token
```

The token inherits your own ClickUp permissions — you can read any task you can
see in the app. No per-task sharing step is required.

Both files live in `scripts/`, next to the code that reads them. `scripts/.env`
is gitignored.

## Settings

| Key | Required | Purpose |
|-----|----------|---------|
| `CLICKUP_API_TOKEN` | yes | Personal token, starts with `pk_` |
| `DEFAULT_TEAM_ID` | no | Workspace id used when a task reference carries no team_id |

`DEFAULT_TEAM_ID` is what lets bare ids and plain task URLs resolve. See
[REFERENCE.md](REFERENCE.md) for how team_id is resolved per request.

## Runtime

Requires **Node >= 22.18**, which runs TypeScript directly via native type
stripping. There is no build step and no dependencies to install.

Optional type-check (types are erased at load time and never checked at runtime).
The skill ships no `node_modules`, so the compiler and `@types/node` are
supplied at check time. Run from the skill root:

```bash
cd ~/.claude/skills/clickup/scripts
npx -p typescript -p @types/node sh -c \
  'tsc --noEmit -p . --typeRoots "$(dirname $(dirname $(which tsc)))/@types"'
```

The `--typeRoots` flag is required: `tsconfig.json` sets `"types": ["node"]`,
and the default type root resolution starts at the `tsconfig.json` directory,
so it never finds the packages npx installed elsewhere.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| `CLICKUP_API_TOKEN not configured` | No `scripts/.env`, or the key is unset in it |
| `401` | Token missing, invalid, or revoked |
| `404` | Usually a custom task id without the right `team_id` — see [REFERENCE.md](REFERENCE.md) |
