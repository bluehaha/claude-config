/**
 * Notion blocks -> Markdown renderer
 *
 * Input is the block tree produced by api/pages.mjs (each block carries a
 * `_children` array). Output is a markdown string.
 */

// --- Rich text -------------------------------------------------------------

// Render a single rich_text item, applying annotations and links.
function renderRichTextItem(rt) {
  let text = rt.plain_text ?? '';
  if (!text) return '';

  const a = rt.annotations || {};

  // Code spans shouldn't also get markdown emphasis wrapping inside them.
  if (a.code) {
    text = '`' + text + '`';
  } else {
    if (a.bold) text = `**${text}**`;
    if (a.italic) text = `*${text}*`;
    if (a.strikethrough) text = `~~${text}~~`;
  }

  const href = rt.href || rt.text?.link?.url;
  if (href) {
    text = `[${text}](${href})`;
  }

  return text;
}

// Render an array of rich_text items to a markdown string.
export function renderRichText(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map(renderRichTextItem).join('');
}

// --- Blocks ----------------------------------------------------------------

const INDENT = '  ';

// Render a list of blocks. `depth` controls indentation for nested content;
// `numbering` carries the running counter for numbered lists at this level.
function renderBlocks(blocks, depth = 0) {
  const lines = [];
  let numberedCounter = 0;

  for (const block of blocks) {
    // Reset the numbered-list counter whenever we hit a non-numbered block.
    if (block.type !== 'numbered_list_item') {
      numberedCounter = 0;
    } else {
      numberedCounter += 1;
    }
    lines.push(renderBlock(block, depth, numberedCounter));
  }

  // Drop empty renders (unsupported/void blocks may return '').
  return lines.filter((l) => l !== null && l !== undefined);
}

// Indent every line of a (possibly multi-line) string by `depth` levels.
function indent(text, depth) {
  if (depth <= 0) return text;
  const pad = INDENT.repeat(depth);
  return text
    .split('\n')
    .map((l) => (l.length ? pad + l : l))
    .join('\n');
}

// Render children of a block, indented one level deeper.
function renderChildren(block, depth) {
  if (!block._children || block._children.length === 0) return '';
  const rendered = renderBlocks(block._children, depth + 1);
  return rendered.length ? '\n' + rendered.join('\n') : '';
}

function renderBlock(block, depth, numbered) {
  const type = block.type;
  const data = block[type] || {};
  const text = renderRichText(data.rich_text);

  switch (type) {
    case 'paragraph':
      return indent(text || '', depth) + renderChildren(block, depth);

    case 'heading_1':
      return indent(`# ${text}`, depth) + renderChildren(block, depth);
    case 'heading_2':
      return indent(`## ${text}`, depth) + renderChildren(block, depth);
    case 'heading_3':
      return indent(`### ${text}`, depth) + renderChildren(block, depth);

    case 'bulleted_list_item':
      return indent(`- ${text}`, depth) + renderChildren(block, depth);

    case 'numbered_list_item':
      return indent(`${numbered}. ${text}`, depth) + renderChildren(block, depth);

    case 'to_do': {
      const checked = data.checked ? 'x' : ' ';
      return indent(`- [${checked}] ${text}`, depth) + renderChildren(block, depth);
    }

    case 'toggle':
      // Render toggles as bullets with their (expanded) contents nested beneath.
      return indent(`- ${text}`, depth) + renderChildren(block, depth);

    case 'quote':
      return indent(`> ${text}`, depth) + renderChildren(block, depth);

    case 'callout': {
      const icon = data.icon?.emoji ? `${data.icon.emoji} ` : '';
      return indent(`> ${icon}${text}`, depth) + renderChildren(block, depth);
    }

    case 'code': {
      const lang = data.language && data.language !== 'plain text' ? data.language : '';
      const body = renderRichText(data.rich_text);
      return indent('```' + lang + '\n' + body + '\n```', depth);
    }

    case 'divider':
      return indent('---', depth);

    case 'equation':
      return indent('$$\n' + (data.expression || '') + '\n$$', depth);

    case 'image':
    case 'video':
    case 'file':
    case 'pdf': {
      const url = data.type === 'external' ? data.external?.url : data.file?.url;
      const caption = renderRichText(data.caption) || type;
      if (!url) return indent(`<!-- ${type} (no url) -->`, depth);
      if (type === 'image') return indent(`![${caption}](${url})`, depth);
      return indent(`[${caption}](${url})`, depth);
    }

    case 'bookmark':
    case 'embed':
    case 'link_preview': {
      const url = data.url;
      const caption = renderRichText(data.caption);
      return indent(caption ? `[${caption}](${url})` : url || '', depth);
    }

    case 'table':
      return renderTable(block, depth);

    case 'child_page':
      // Not recursed into (see pages.mjs). Rendered as a reference.
      return indent(`[📄 ${data.title || 'Untitled'}](https://www.notion.so/${(block.id || '').replace(/-/g, '')})`, depth);

    case 'child_database':
      return indent(`[🗄️ ${data.title || 'Untitled database'}](https://www.notion.so/${(block.id || '').replace(/-/g, '')})`, depth);

    case 'table_of_contents':
      return indent('<!-- table of contents -->', depth);

    case 'breadcrumb':
    case 'column_list':
    case 'column':
      // Structural containers with no text of their own - just render children.
      return renderChildren(block, depth).replace(/^\n/, '') || null;

    case 'synced_block':
      return renderChildren(block, depth).replace(/^\n/, '') || null;

    default:
      // Degrade gracefully rather than dropping content silently.
      return indent(`<!-- unsupported block: ${type} -->${text ? '\n' + text : ''}`, depth);
  }
}

// Render a table block. Its _children are table_row blocks.
function renderTable(block, depth) {
  const rows = (block._children || []).filter((c) => c.type === 'table_row');
  if (rows.length === 0) return indent('<!-- empty table -->', depth);

  const hasColumnHeader = block.table?.has_column_header;

  const renderRow = (row) =>
    '| ' + row.table_row.cells.map((cell) => renderRichText(cell).replace(/\|/g, '\\|') || ' ').join(' | ') + ' |';

  const lines = [];
  const [first, ...rest] = rows;
  lines.push(renderRow(first));

  // Markdown tables require a header separator row. Use the first row as header
  // when the table declares one; otherwise synthesize a blank header so the
  // table still renders.
  const colCount = first.table_row.cells.length;
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');

  if (!hasColumnHeader) {
    // First row was data, not a header; re-emit it below the separator.
    lines.unshift('| ' + Array(colCount).fill(' ').join(' | ') + ' |');
    // Now: blank header, separator, first row, rest...
  }

  for (const row of rest) {
    lines.push(renderRow(row));
  }

  return indent(lines.join('\n'), depth);
}

// Top-level entry: render a page's block tree to markdown.
export function blocksToMarkdown(blocks) {
  const rendered = renderBlocks(blocks, 0);
  // Join with blank lines between top-level blocks for readable markdown.
  return rendered.join('\n\n');
}
