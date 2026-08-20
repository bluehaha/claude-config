# Notion Skill Reference

## Contents

- Supported URL / ID formats
- Output format
- Content depth
- API notes
- Implementation notes

## Supported URL / ID formats

The skill extracts a 32-character page id from any of these and normalizes it to
the dashed UUID the API expects:

| Input | Note |
|-------|------|
| `ffbdd143bae2428eb3d1bc5e4b3860e4` | bare hex |
| `ffbdd143-bae2-428e-b3d1-bc5e4b3860e4` | dashed UUID, used as-is |
| `https://www.notion.so/Page-Title-ffbdd143…860e4` | slug + id |
| `https://app.notion.com/p/universetech/ffbdd143…860e4` | workspace + id |
| `https://www.notion.so/…?p=ffbdd143…860e4` | peek param |

When several 32-char hex runs appear, the **last** one wins — a slug whose title
happens to contain a long hex run still resolves to the trailing id.

## Output format

Markdown by default; `--json` prints the raw `{ page, blocks }` pair instead.

The markdown output is a header followed by the rendered block tree:

```
# Page Title

Created: 2024-01-10 09:30 UTC
Last edited: 2024-01-15 14:45 UTC
URL: https://www.notion.so/ffbdd143bae2428eb3d1bc5e4b3860e4
ID: ffbdd143-bae2-428e-b3d1-bc5e4b3860e4

Properties:
  Status: In progress
  Tags: spec, backend

---

## Section heading

Paragraph text with **bold**, *italic*, and `code`.

- Bullet item
  - Nested bullet
- [ ] Unchecked to-do
- [x] Completed to-do

> Callout or quote text
```

The title comes from whichever property has type `title` (its name varies —
`Name`, `title`, etc.). Non-title properties are listed under `Properties:` only
when they carry a value, so a bare page prints no property block.

Under `--json`, each block additionally carries a synthetic `_children` array —
not part of the API response, but attached while assembling the tree.

### Block type coverage

| Rendered as | Types |
|---|---|
| Markdown headings | `heading_1` … `heading_3` |
| Lists | `bulleted_list_item`, `numbered_list_item`, `to_do`, `toggle` |
| Blockquote | `quote`, `callout` (emoji icon prefixed) |
| Fenced code | `code` (language preserved unless "plain text") |
| Tables | `table` + `table_row` |
| Links / embeds | `bookmark`, `embed`, `link_preview`, `file`, `video`, `pdf` |
| Images | `image` |
| Passthrough | `divider`, `equation`, `table_of_contents` |
| Children only | `column_list`, `column`, `breadcrumb`, `synced_block` |
| Reference links | `child_page`, `child_database` |

Markdown requires a header separator row on every table. When a Notion table has
`has_column_header: false`, a blank header row is synthesized above the separator
so the data rows survive intact.

Anything unhandled degrades to `<!-- unsupported block: type -->` (with its text
if it had any) rather than failing the page.

## Content depth

- **Nested blocks are expanded** — toggles, columns, list items, and callouts are
  recursed into and rendered inline, at any depth.
- **Child pages and child databases are NOT fetched.** They render as links
  (`[📄 Title]`, `[🗄️ Title]`). Run `get` on the child's own URL to read it.

Without that boundary, a single `get` on a hub page could pull an entire
workspace.

## API notes

- Uses the Notion API v1 (`https://api.notion.com/v1`) with the
  `Notion-Version: 2022-06-28` header.
- Auth is the integration secret as a bearer token.
- A page is two calls: `GET /pages/{id}` for properties, then
  `GET /blocks/{id}/children` walked recursively for content.
- Block children are paginated 100 per request and followed via `next_cursor`
  until `has_more` is false.
- Media URLs for Notion-hosted files are **signed and expire after one hour**, so
  the same page yields different image URLs on each run.
- A 404 nearly always means the page has not been shared with the integration —
  see [SETUP.md](SETUP.md).

## Implementation notes

Layout under `scripts/`:

| Path | Role |
|------|------|
| `scripts/query.ts` | CLI entry point — arg parsing, command dispatch |
| `scripts/api/client.ts` | HTTP layer, `.env` loading, auth, error hints |
| `scripts/api/pages.ts` | `GET /pages/{id}` + recursive block-children walk |
| `scripts/commands/get.ts` | `get` command — fetch, render markdown or JSON, print |
| `scripts/commands/usage.ts` | CLI usage text |
| `scripts/lib/parse.ts` | Normalizes URLs and bare ids into a dashed UUID |
| `scripts/lib/format.ts` | Page header — title, timestamps, property summary |
| `scripts/lib/markdown.ts` | Block tree → markdown renderer |
| `scripts/types.ts` | Shared Notion domain types |
| `scripts/tsconfig.json` | Type-check config (no emit) |
| `scripts/package.json` | ESM marker + `@types/node` for editor tooling |
| `scripts/.env-example` | Template for `scripts/.env` |

Written in TypeScript and executed directly by Node's built-in type stripping,
so there is no build step and no runtime dependencies. Types are erased at load
time and never type-checked at runtime — run `tsc` for that (see
[SETUP.md](SETUP.md)). `erasableSyntaxOnly` in `tsconfig.json` rejects any syntax
Node cannot strip (enums, namespaces, parameter properties).

`package.json` declares `"type": "module"`. These files are ESM, and without the
marker Node reparses them as ESM after a failed CommonJS parse and prints a
`MODULE_TYPELESS_PACKAGE_JSON` warning to stderr on every run.
