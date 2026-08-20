# Notion Skill Setup

One-time setup: an integration token in `.env`, the per-page sharing step, and
Node >= 22.18.

## API token

1. Create an **internal integration** at https://www.notion.so/my-integrations
2. Copy its *Internal Integration Secret*. It starts with `ntn_` or `secret_`.
3. Copy `.env-example` to `.env` and paste the token:

```bash
cd ~/.claude/skills/notion/scripts
cp .env-example .env
# Edit .env and add your token
```

Both files live in `scripts/`, next to the code that reads them. `scripts/.env`
is gitignored.

## Share each page with the integration

Unlike a personal access token, a Notion integration starts with access to
nothing. **The API returns 404 for any page that has not been shared with it** —
this is the single most common cause of failure, and it looks identical to a
missing page.

For each page (or ancestor) you want to read:

- Open the page in Notion
- Click the `...` menu (top right) → **Connections**
- Add your integration

Sharing a parent page grants access to its child pages too, so sharing one
top-level page usually covers a whole tree.

## Settings

| Key | Required | Purpose |
|-----|----------|---------|
| `NOTION_API_TOKEN` | yes | Internal Integration Secret, starts with `ntn_` or `secret_` |

## Runtime

Requires **Node >= 22.18**, which runs TypeScript directly via native type
stripping. There is no build step and no runtime dependencies to install.

Optional type-check (types are erased at load time and never checked at runtime).
`@types/node` is declared in `package.json` for editor tooling; the compiler
itself is supplied at check time. Run from `scripts/`:

```bash
cd ~/.claude/skills/notion/scripts
npx -p typescript -p @types/node sh -c \
  'tsc --noEmit -p . --typeRoots "$(dirname $(dirname $(which tsc)))/@types"'
```

The `--typeRoots` flag is required: `tsconfig.json` sets `"types": ["node"]`,
and the default type root resolution starts at the `tsconfig.json` directory,
so it never finds the packages npx installed elsewhere.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| `NOTION_API_TOKEN not configured` | No `scripts/.env`, or the key is unset in it |
| `401` | Token missing, invalid, or revoked |
| `404` | Almost always the page has not been shared with the integration — see above |
| `Could not parse a Notion page ID from input` | Input carried no 32-char hex id or dashed UUID |
