/**
 * `commit-list <url|id>` - commits included in the MR.
 */

import { getCommits } from '../api/merge-requests.ts';
import { refFrom } from '../lib/parse.ts';
import { formatCommits } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runCommitList(
  target: string | undefined,
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const commits = await getCommits(ref);
  out(commits, formatCommits(commits), options);
}
