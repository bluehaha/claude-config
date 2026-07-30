#!/usr/bin/env node

/**
 * Notion - read page content via the Notion API
 *
 * Commands:
 *   get <url|id>   Retrieve a page's properties + content rendered as markdown
 *
 * Options:
 *   --json         Output raw JSON (page object + block tree) instead of markdown
 */

import { loadEnv } from './api/client.mjs';
import { getPageTree } from './api/pages.mjs';
import { parsePageId } from './lib/parse.mjs';
import { formatPageHeader } from './lib/format.mjs';
import { blocksToMarkdown } from './lib/markdown.mjs';

// Parse arguments
const args = process.argv.slice(2);
let command = null;
let targetInput = null;
let jsonOutput = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--json') {
    jsonOutput = true;
  } else if (!command) {
    command = arg;
  } else if (!targetInput) {
    targetInput = arg;
  }
}

function showUsage() {
  console.error(`Usage: node query.mjs <command> [options]

Commands:
  get <url|id>   Retrieve a page's properties + content as markdown

Options:
  --json         Output raw JSON (page object + block tree)

Examples:
  node query.mjs get "https://app.notion.com/p/universetech/ffbdd143bae2428eb3d1bc5e4b3860e4"
  node query.mjs get ffbdd143bae2428eb3d1bc5e4b3860e4
  node query.mjs get ffbdd143bae2428eb3d1bc5e4b3860e4 --json`);
  process.exit(1);
}

async function main() {
  loadEnv();

  if (!command) {
    showUsage();
  }

  try {
    switch (command) {
      case 'get': {
        if (!targetInput) {
          console.error('Error: Page URL or ID required');
          console.error('Usage: node query.mjs get <url|id>');
          process.exit(1);
        }
        const pageId = parsePageId(targetInput);
        if (!pageId) {
          console.error('Error: Could not parse a Notion page ID from input');
          console.error('Expected a page URL or a 32-character ID.');
          process.exit(1);
        }

        const { page, blocks } = await getPageTree(pageId);

        if (jsonOutput) {
          console.log(JSON.stringify({ page, blocks }, null, 2));
        } else {
          const header = formatPageHeader(page);
          const body = blocksToMarkdown(blocks);
          console.log(header);
          console.log('');
          console.log('---');
          console.log('');
          console.log(body);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        showUsage();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
