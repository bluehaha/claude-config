/**
 * CLI usage text for scripts/query.ts.
 */

export function showUsage(): never {
  console.error(`Usage: node scripts/query.ts <command> [options]

Commands:
  get <url|id>   Retrieve a page's properties + content as markdown

Options:
  --json         Output raw JSON (page object + block tree) instead of the
                 rendered markdown.

Examples:
  node scripts/query.ts get "https://app.notion.com/p/universetech/ffbdd143bae2428eb3d1bc5e4b3860e4"
  node scripts/query.ts get ffbdd143bae2428eb3d1bc5e4b3860e4
  node scripts/query.ts get ffbdd143bae2428eb3d1bc5e4b3860e4 --json`);
  process.exit(1);
}
