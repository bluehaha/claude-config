/**
 * `get <url|id>` - retrieve a task (fields, description, checklists) plus its
 * comments and print the pair as JSON.
 *
 * Output is condensed by default: the raw API response is dominated by metadata
 * (full task objects per subtask, option lists for unset custom fields, seven
 * URL variants per attachment) that crowds out the content. Pass `--raw` for
 * the unmodified response.
 */

import { getTask } from '../api/tasks.ts';
import { getTaskComments } from '../api/comments.ts';
import { parseTaskRef } from '../lib/parse.ts';
import { condenseResult } from '../lib/condense.ts';
import type { TaskQueryResult } from '../types.ts';

export interface GetOptions {
  /** Print the unmodified API response instead of the condensed shape. */
  raw?: boolean;
}

export async function runGet(
  targetInput: string | null,
  options: GetOptions = {},
): Promise<void> {
  if (!targetInput) {
    console.error('Error: Task URL or ID required');
    console.error('Usage: node scripts/query.ts get <url|id> [--raw]');
    process.exit(1);
  }

  const ref = parseTaskRef(targetInput);
  if (!ref) {
    console.error('Error: Could not parse a ClickUp task ID from input');
    console.error('Expected a task URL or a task id.');
    process.exit(1);
  }

  // team_id resolution: the URL wins; otherwise fall back to DEFAULT_TEAM_ID
  // from .env. When neither supplies one, the lookup is a plain native-id lookup.
  const teamId: string | null = ref.teamId || process.env.DEFAULT_TEAM_ID || null;

  const [task, comments] = await Promise.all([
    getTask(ref.taskId, { teamId }),
    getTaskComments(ref.taskId, { teamId }),
  ]);

  const result: TaskQueryResult = { task, comments };
  const output = options.raw ? result : condenseResult(result);
  console.log(JSON.stringify(output, null, 2));
}
