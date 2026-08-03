#!/usr/bin/env node

/**
 * ClickUp - read task content via the ClickUp API
 *
 * Commands:
 *   get <url|id>   Retrieve a task (fields, description, checklists) + comments as JSON
 *
 * Flags:
 *   --raw          Print the unmodified API response instead of the condensed shape
 *
 * team_id resolution: taken from the URL when it has the /t/{team_id}/{task_id}
 * shape, otherwise from DEFAULT_TEAM_ID in .env.
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
let raw = false;

for (const arg of args) {
  if (arg === '--raw') {
    raw = true;
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
        await runGet(targetInput, { raw });
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
