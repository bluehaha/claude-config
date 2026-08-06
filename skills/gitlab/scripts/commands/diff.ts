/**
 * `diff <url|id>` - changed files and their diffs.
 */

import { getDiffs } from '../api/merge-requests.ts';
import { refFrom } from '../lib/parse.ts';
import { formatDiffs } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runDiff(
  target: string | undefined,
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const data = await getDiffs(ref);
  out(data, formatDiffs(data), options);
}
