---
name: notion
description: Read Notion page content via the Notion API - retrieve a page's properties and full block content rendered as markdown. Use when working with Notion page URLs or IDs.
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/query.mjs:*)
---

# Notion

Read Notion page content via the API. Given a page URL or ID, retrieve the page's
title/properties and render its full block content (headings, lists, to-dos,
toggles, quotes, callouts, code, tables, images, etc.) as markdown.

## Setup

1. Create an **internal integration** at https://www.notion.so/my-integrations
2. Copy its *Internal Integration Secret* (starts with `ntn_` or `secret_`)
3. Copy `.env-example` to `.env` in this skill directory and paste the token:

```bash
cp ~/.claude/skills/notion/.env-example ~/.claude/skills/notion/.env
# Edit .env and add your token
```

4. **Share each page with the integration.** Notion's permission model requires
   this — the API returns 404 for pages the integration can't access:
   - Open the page in Notion
   - Click the `...` menu (top right) → **Connections** → add your integration
   - Sharing a parent page grants access to its child pages too

## Running Commands

```bash
node ~/.claude/skills/notion/query.mjs <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `get <url\|id>` | Retrieve a page's properties + content rendered as markdown |

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (page object + block tree) instead of markdown |

## Examples

### Get Page Content

```bash
# Using a full URL
node ~/.claude/skills/notion/query.mjs get "https://app.notion.com/p/universetech/ffbdd143bae2428eb3d1bc5e4b3860e4"

# Using a page ID directly
node ~/.claude/skills/notion/query.mjs get ffbdd143bae2428eb3d1bc5e4b3860e4

# Raw JSON (for scripting or inspecting block structure)
node ~/.claude/skills/notion/query.mjs get ffbdd143bae2428eb3d1bc5e4b3860e4 --json
```

## Supported URL / ID Formats

The skill extracts the 32-character page ID from any of these:

- Bare hex ID: `ffbdd143bae2428eb3d1bc5e4b3860e4`
- Dashed UUID: `ffbdd143-bae2-428e-b3d1-bc5e4b3860e4`
- Workspace URL: `https://app.notion.com/p/universetech/ffbdd143bae2428eb3d1bc5e4b3860e4`
- Slug URL: `https://www.notion.so/Page-Title-ffbdd143bae2428eb3d1bc5e4b3860e4`

## Output Format

```
# Page Title

Created: 2024-01-10 09:30 UTC
Last edited: 2024-01-15 14:45 UTC
URL: https://www.notion.so/ffbdd143bae2428eb3d1bc5e4b3860e4
ID: ffbdd143-bae2-428e-b3d1-bc5e4b3860e4

---

## Section heading

Paragraph text with **bold**, *italic*, and `code`.

- Bullet item
  - Nested bullet
- [ ] Unchecked to-do
- [x] Completed to-do

> Callout or quote text

​```js
console.log("code block");
​```
```

## Content Depth

- **Nested blocks are expanded**: toggles, columns, list items, and callouts
  are recursed into and rendered inline.
- **Child pages and child databases are NOT fetched** — they appear as links
  (`[📄 Title]`, `[🗄️ Title]`). To read a child page, run `get` on its own URL.

## When to Use

- **Understanding context**: read a Notion spec, doc, or notes page before starting work
- **Extracting content**: pull page content into your terminal as clean markdown
- **Inspecting structure**: use `--json` to see the raw block tree

## Technical Notes

- Uses the Notion API v1 (`https://api.notion.com/v1`) with the
  `Notion-Version: 2022-06-28` header.
- Block children are fetched with pagination (100 per request) and assembled
  into a tree before rendering.
- A 404 usually means the page hasn't been shared with the integration — see Setup.
- Unsupported block types degrade to an `<!-- unsupported block: type -->`
  comment rather than failing the whole page.
