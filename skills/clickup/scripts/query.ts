#!/usr/bin/env node

/**
 * ClickUp - read task content via the ClickUp API
 *
 * Commands:
 *   get <url|id>   Retrieve a task (fields, description, checklists) + comments as JSON
 *
 * team_id resolution: taken from the URL when it has the /t/{team_id}/{task_id}
 * shape, otherwise from DEFAULT_TEAM_ID in .env.
 *
 * Runs directly on Node >= 22.18 via native type stripping - no build step.
 */

import { loadEnv } from './api/client.ts';
import { getTask } from './api/tasks.ts';
import { getTaskComments } from './api/comments.ts';
import { parseTaskRef } from './lib/parse.ts';
import type { TaskQueryResult } from './types.ts';

// Parse arguments
const args: string[] = process.argv.slice(2);
let command: string | null = null;
let targetInput: string | null = null;

for (const arg of args) {
  if (!command) {
    command = arg;
  } else if (!targetInput) {
    targetInput = arg;
  }
}

function showUsage(): never {
  console.error(`Usage: node scripts/query.ts <command>

Commands:
  get <url|id>   Retrieve a task + its comments as JSON

team_id is read from the URL (/t/{team_id}/{task_id}), else DEFAULT_TEAM_ID in .env.

Examples:
  node scripts/query.ts get "https://app.clickup.com/t/3716037/86eyc0enm"
  node scripts/query.ts get 86abc123
  node scripts/query.ts get 86eyc0enm`);
  process.exit(1);
}

async function main(): Promise<void> {
  loadEnv();

  if (!command) {
    showUsage();
  }

  try {
    switch (command) {
      case 'get': {
        if (!targetInput) {
          console.error('Error: Task URL or ID required');
          console.error('Usage: node scripts/query.ts get <url|id>');
          process.exit(1);
        }

        const ref = parseTaskRef(targetInput);
        if (!ref) {
          console.error('Error: Could not parse a ClickUp task ID from input');
          console.error('Expected a task URL or a task id.');
          process.exit(1);
        }

        // team_id resolution: the URL wins; otherwise fall back to
        // DEFAULT_TEAM_ID from .env. When neither supplies one, the lookup is
        // a plain native-id lookup.
        const teamId: string | null = ref.teamId || process.env.DEFAULT_TEAM_ID || null;

        const [task, comments] = await Promise.all([
          getTask(ref.taskId, { teamId }),
          getTaskComments(ref.taskId, { teamId }),
        ]);

        const result: TaskQueryResult = { task, comments };
        console.log(JSON.stringify(result, null, 2));
        break;
      }

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
