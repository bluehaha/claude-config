#!/usr/bin/env node

/**
 * GitLab - interact with merge requests via the REST API v4.
 *
 * Commands:
 *   get <url|id>            MR details
 *   diff <url|id>           Changed files and diffs
 *   comments <url|id>       List comments (notes)
 *   commit-list <url|id>    Commits in the MR
 *   approvals <url|id>      Approval status
 *   comment <url|id> "msg"  Post a comment (write; needs "api" scope)
 *   me                      Show the token's user
 *
 * Flags:
 *   --json                  Print the raw API response instead of formatted text
 *
 * Works with self-hosted instances: the host comes from the MR URL when given,
 * otherwise from GITLAB_HOST in .env.
 *
 * Runs directly on Node >= 22.18 via native type stripping - no build step.
 */

import { loadEnv, GitLabError } from './api/client.ts';
import { runGet } from './commands/get.ts';
import { runDiff } from './commands/diff.ts';
import { runComments } from './commands/comments.ts';
import { runCommitList } from './commands/commit-list.ts';
import { runApprovals } from './commands/approvals.ts';
import { runComment } from './commands/comment.ts';
import { runMe } from './commands/me.ts';
import { showUsage, showUsageAsError, showUnknownCommand } from './commands/usage.ts';

// Parse arguments. Flags are recognised anywhere; the remaining positionals are
// the command, its target, and (for `comment`) the message words.
const args: string[] = process.argv.slice(2);
const positional: string[] = [];
let json = false;

for (const arg of args) {
  if (arg === '--json') json = true;
  else positional.push(arg);
}

const [command, target, ...rest] = positional;

async function main(): Promise<void> {
  loadEnv();

  if (!command) {
    showUsageAsError();
  }
  if (command === 'help' || command === '--help' || command === '-h') {
    showUsage();
  }

  try {
    switch (command) {
      case 'get':
        await runGet(target, { json });
        break;

      case 'diff':
        await runDiff(target, { json });
        break;

      case 'comments':
        await runComments(target, { json });
        break;

      case 'commit-list':
        await runCommitList(target, { json });
        break;

      case 'approvals':
        await runApprovals(target, { json });
        break;

      case 'comment':
        await runComment(target, rest, { json });
        break;

      case 'me':
        await runMe({ json });
        break;

      default:
        showUnknownCommand(command);
    }
  } catch (err) {
    // GitLabError and parse errors carry messages written for the user; anything
    // else is a genuine bug, so let it surface with its stack.
    if (err instanceof GitLabError || err instanceof Error) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
