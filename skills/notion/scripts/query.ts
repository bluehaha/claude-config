#!/usr/bin/env node

/**
 * Notion - read page content via the Notion API
 *
 * Commands:
 *   get <url|id>   Retrieve a page's properties + content rendered as markdown
 *
 * Flags:
 *   --json         Output raw JSON (page object + block tree) instead of markdown
 *
 * Runs directly on Node >= 22.18 via native type stripping - no build step.
 */

import { loadEnv } from './api/client.ts';
import { runGet } from './commands/get.ts';
import { showUsage } from './commands/usage.ts';

// Parse arguments. Flags are recognised anywhere; the first two remaining
// positionals are the command and its target.
const args: string[] = process.argv.slice(2);
let command: string | null = null;
let targetInput: string | null = null;
let json = false;

for (const arg of args) {
  if (arg === '--json') {
    json = true;
  } else if (!command) {
    command = arg;
  } else if (!targetInput) {
    targetInput = arg;
  }
}

async function main(): Promise<void> {
  loadEnv();

  if (!command) {
    showUsage();
  }

  try {
    switch (command) {
      case 'get':
        await runGet(targetInput, { json });
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showUsage();
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
