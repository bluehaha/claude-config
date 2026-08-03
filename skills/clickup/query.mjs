#!/usr/bin/env node

/**
 * ClickUp - read task content via the ClickUp API
 *
 * Commands:
 *   get <url|id>   Retrieve a task (fields, description, checklists) + comments as JSON
 *
 * team_id resolution: taken from the URL when it has the /t/{team_id}/{task_id}
 * shape, otherwise from DEFAULT_TEAM_ID in .env.
 */

import { loadEnv } from './api/client.mjs';
import { getTask } from './api/tasks.mjs';
import { getTaskComments } from './api/comments.mjs';
import { parseTaskRef } from './lib/parse.mjs';

// Parse arguments
const args = process.argv.slice(2);
let command = null;
let targetInput = null;

for (const arg of args) {
  if (!command) {
    command = arg;
  } else if (!targetInput) {
    targetInput = arg;
  }
}

function showUsage() {
  console.error(`Usage: node query.mjs <command>

Commands:
  get <url|id>   Retrieve a task + its comments as JSON

team_id is read from the URL (/t/{team_id}/{task_id}), else DEFAULT_TEAM_ID in .env.

Examples:
  node query.mjs get "https://app.clickup.com/t/3716037/86eyc0enm"
  node query.mjs get 86abc123
  node query.mjs get 86eyc0enm`);
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
          console.error('Error: Task URL or ID required');
          console.error('Usage: node query.mjs get <url|id>');
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
        const teamId = ref.teamId || process.env.DEFAULT_TEAM_ID || null;

        const [task, comments] = await Promise.all([
          getTask(ref.taskId, { teamId }),
          getTaskComments(ref.taskId, { teamId }),
        ]);

        console.log(JSON.stringify({ task, comments }, null, 2));
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
