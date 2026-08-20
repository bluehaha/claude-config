/**
 * `get <url|id>` - retrieve a page's properties and full block tree, and print
 * it as markdown (default) or as raw JSON (`--json`).
 *
 * The markdown path is the point of the skill: Notion's block tree is deeply
 * nested and verbose, and rendering it flattens the content into something
 * readable. `--json` exposes the underlying page object and block tree for
 * scripting or for inspecting block structure.
 */

import { getPageTree } from '../api/pages.ts';
import { parsePageId } from '../lib/parse.ts';
import { formatPageHeader } from '../lib/format.ts';
import { blocksToMarkdown } from '../lib/markdown.ts';

export interface GetOptions {
  /** Print the raw page object + block tree instead of rendered markdown. */
  json?: boolean;
}

export async function runGet(
  targetInput: string | null,
  options: GetOptions = {},
): Promise<void> {
  if (!targetInput) {
    console.error('Error: Page URL or ID required');
    console.error('Usage: node scripts/query.ts get <url|id> [--json]');
    process.exit(1);
  }

  const pageId = parsePageId(targetInput);
  if (!pageId) {
    console.error('Error: Could not parse a Notion page ID from input');
    console.error('Expected a page URL or a 32-character ID.');
    process.exit(1);
  }

  const { page, blocks } = await getPageTree(pageId);

  if (options.json) {
    console.log(JSON.stringify({ page, blocks }, null, 2));
    return;
  }

  const header = formatPageHeader(page);
  const body = blocksToMarkdown(blocks);
  console.log(header);
  console.log('');
  console.log('---');
  console.log('');
  console.log(body);
}
