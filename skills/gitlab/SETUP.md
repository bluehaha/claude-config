# GitLab Skill Setup

One-time setup: a personal access token in `.env`, and Node >= 22.18.

## Access token

1. In GitLab, open **User Settings → Access Tokens**.
2. Create a token. Pick the scope by what you need:
   - **`api`** — required to post comments (the `comment` command).
   - **`read_api`** — enough if you only ever read. Safer; `comment` will fail with a 403.
3. Copy `.env-example` to `.env` and paste the token:

```bash
cd ~/.claude/skills/gitlab/scripts
cp .env-example .env
# Edit .env: set GITLAB_HOST and GITLAB_TOKEN
```

The token inherits your own GitLab permissions — you can read any MR you can see
in the web UI. No per-project setup is required.

Both files live in `scripts/`, next to the code that reads them. `scripts/.env`
is gitignored.

## Settings

| Key | Required | Purpose |
|-----|----------|---------|
| `GITLAB_HOST` | yes* | Instance root, e.g. `https://gitlab.example.com` — no trailing slash, no `/api` path |
| `GITLAB_TOKEN` | yes | Personal access token, scope `api` or `read_api` |
| `GITLAB_DEFAULT_PROJECT` | no | Project path (`mygroup/myrepo`) so a bare MR iid resolves |

\* `GITLAB_HOST` is only strictly needed for the shorthand and bare-iid forms,
and for `me`. A full MR URL carries its own host and works without it.

Real environment variables take precedence over `.env`, so any key can be
overridden per-invocation:

```bash
GITLAB_DEFAULT_PROJECT=mygroup/myrepo node scripts/query.ts get 4230
```

See [REFERENCE.md](REFERENCE.md) for how a host is resolved per request.

## Runtime

Requires **Node >= 22.18**, which runs TypeScript directly via native type
stripping. There is no build step and no dependencies to install — the HTTP layer
is Node's built-in `fetch`.

Optional type-check (types are erased at load time and never checked at runtime).
The skill ships no `node_modules`, so the compiler and `@types/node` are
supplied at check time. Run from `scripts/`:

```bash
cd ~/.claude/skills/gitlab/scripts
npx -p typescript -p @types/node sh -c \
  'tsc --noEmit -p . --typeRoots "$(dirname $(dirname $(which tsc)))/@types"'
```

The `--typeRoots` flag is required: `tsconfig.json` sets `"types": ["node"]`,
and the default type root resolution starts at the `tsconfig.json` directory,
so it never finds the packages npx installed elsewhere.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| `No GITLAB_TOKEN set` | No `scripts/.env`, or the key is unset in it |
| `No GitLab host` | `GITLAB_HOST` unset and the reference wasn't a full URL |
| `401` | Token missing, expired, or revoked |
| `403` | Token scope too narrow — posting a comment needs `api`, not `read_api` |
| `404` | Wrong project path, MR iid, or host — see [REFERENCE.md](REFERENCE.md) |
| `Network error reaching ...` | Host unreachable: wrong `GITLAB_HOST`, or VPN not connected |
