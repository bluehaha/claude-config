/**
 * Formatting for the page header (title, properties, timestamps, URL).
 */

import { renderRichText } from './markdown.ts';
import type { NotionPage, NotionPropertyValue } from '../types.ts';

/**
 * Extract the page title from its properties. Notion stores the title under a
 * property of type "title" whose name varies ("Name", "title", etc.).
 */
export function getPageTitle(page: NotionPage): string {
  const props = page.properties ?? {};
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop?.type === 'title') {
      const text = renderRichText(prop.title);
      if (text) return text;
    }
  }
  return 'Untitled';
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // Keep it simple and locale-stable: trim the ISO string to minutes.
  // e.g. 2024-01-15T14:30:00.000Z -> 2024-01-15 14:30 UTC
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]} UTC` : iso;
}

/**
 * Render a single property value to a short string, for the header summary.
 *
 * Returns '' for an unset or unhandled property; the caller treats that as
 * "omit this line". Note that a numeric 0 must still render as "0", so the
 * number branch checks for null/undefined rather than falsiness.
 */
function formatPropertyValue(prop: NotionPropertyValue): string {
  switch (prop.type) {
    case 'title':
      return renderRichText(prop.title);
    case 'rich_text':
      return renderRichText(prop.rich_text);
    case 'number':
      return prop.number === null || prop.number === undefined ? '' : String(prop.number);
    case 'select':
      return prop.select?.name ?? '';
    case 'status':
      return prop.status?.name ?? '';
    case 'multi_select':
      return (prop.multi_select ?? []).map((s) => s.name).join(', ');
    case 'people':
      return (prop.people ?? []).map((p) => p.name || p.id).join(', ');
    case 'date': {
      const d = prop.date;
      if (!d) return '';
      return d.end ? `${d.start} → ${d.end}` : d.start || '';
    }
    case 'checkbox':
      return prop.checkbox ? '☑' : '☐';
    case 'url':
      return prop.url ?? '';
    case 'email':
      return prop.email ?? '';
    case 'phone_number':
      return prop.phone_number ?? '';
    case 'created_time':
      return formatDate(prop.created_time) ?? '';
    case 'last_edited_time':
      return formatDate(prop.last_edited_time) ?? '';
    default:
      return '';
  }
}

/** Build the page header block. Returns a markdown string ending before the body. */
export function formatPageHeader(page: NotionPage): string {
  const title = getPageTitle(page);
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');

  const meta: string[] = [];
  const created = formatDate(page.created_time);
  const edited = formatDate(page.last_edited_time);
  if (created) meta.push(`Created: ${created}`);
  if (edited) meta.push(`Last edited: ${edited}`);
  if (page.url) meta.push(`URL: ${page.url}`);
  if (page.id) meta.push(`ID: ${page.id}`);

  for (const line of meta) lines.push(line);

  // Non-title properties, if any carry a value.
  const props = page.properties ?? {};
  const propLines: string[] = [];
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (!prop) continue;
    if (prop.type === 'title') continue; // already shown as the heading
    const value = formatPropertyValue(prop);
    if (value !== '') {
      propLines.push(`${key}: ${value}`);
    }
  }
  if (propLines.length) {
    lines.push('');
    lines.push('Properties:');
    for (const line of propLines) lines.push(`  ${line}`);
  }

  return lines.join('\n');
}
