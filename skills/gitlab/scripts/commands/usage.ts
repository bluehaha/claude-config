/**
 * CLI usage text for scripts/query.ts.
 */

export const USAGE = `GitLab MR CLI

  node scripts/query.ts <command> <url|id> [args] [--json]

Commands:
  get <url|id>              MR details (title, state, author, branches, description)
  diff <url|id>             Changed files and diffs
  comments <url|id>         List comments (notes), system events hidden
  commit-list <url|id>      Commits in the MR
  approvals <url|id>        Approval status
  comment <url|id> "msg"    Post a comment on the MR
  me                        Show the token's user (sanity-check auth)

Reference formats:
  Full URL   https://gitlab.example.com/group/project/-/merge_requests/4230
  Shorthand  group/project!4230
  Bare iid   4230           (needs GITLAB_DEFAULT_PROJECT in .env)

Flags:
  --json     Raw JSON output`;

/** Print usage to stdout and exit 0 - the explicit `help` path. */
export function showUsage(): never {
  console.log(USAGE);
  process.exit(0);
}

/** Print usage to stdout and exit 1 - invoked with no command at all. */
export function showUsageAsError(): never {
  console.log(USAGE);
  process.exit(1);
}

/** Report an unrecognised command on stderr and exit 1. */
export function showUnknownCommand(command: string): never {
  console.error(`Unknown command: ${command}\n\n${USAGE}`);
  process.exit(1);
}
