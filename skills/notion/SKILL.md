---
name: notion
description: Read Notion page content via the Notion API - retrieve a page's properties and full block content rendered as markdown. Use when working with Notion page URLs or IDs.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/query.ts:*)
---

# Notion

Read Notion page content via the API. Given a page URL or ID, retrieve the
page's title and properties and render its full block content — headings, lists,
to-dos, toggles, quotes, callouts, code, tables, images — as markdown.

## Usage

```bash
node ~/.claude/skills/notion/scripts/query.ts get <url|id> [--json]
```

Examples:

```bash
# Full URL
node ~/.claude/skills/notion/scripts/query.ts get "https://app.notion.com/p/universetech/ffbdd143bae2428eb3d1bc5e4b3860e4"

# Bare page ID
node ~/.claude/skills/notion/scripts/query.ts get ffbdd143bae2428eb3d1bc5e4b3860e4
```

A page URL, a dashed UUID, and a bare 32-character hex id are all accepted.

## Output

Markdown by default — a header (title, timestamps, URL, and any non-empty
properties), then the rendered block tree.

```bash
# Raw page object + block tree, for scripting or inspecting block structure
node ~/.claude/skills/notion/scripts/query.ts get ffbdd143bae2428eb3d1bc5e4b3860e4 --json
```

Prefer the default; reach for `--json` when you need the block structure itself.
See [REFERENCE.md](REFERENCE.md#output-format) for the exact shape.

Nested blocks (toggles, columns, list items, callouts) are expanded inline.
Child pages and child databases are **not** fetched — they render as links, so
read one by running `get` on its own URL.

## When to use

- **Understanding context**: read a Notion spec, doc, or notes page before
  starting work.
- **Extracting content**: pull page content into your terminal as clean markdown.
- **Inspecting structure**: use `--json` to see the raw block tree.

## More

- **First-time setup** (integration token, page sharing, `.env`, Node version): see [SETUP.md](SETUP.md)
- **URL/ID formats, output format, content depth, API details**: see [REFERENCE.md](REFERENCE.md)
