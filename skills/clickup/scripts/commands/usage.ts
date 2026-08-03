/**
 * CLI usage text for scripts/query.ts.
 */

export function showUsage(): never {
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
