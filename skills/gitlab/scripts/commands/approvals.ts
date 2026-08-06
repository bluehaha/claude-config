/**
 * `approvals <url|id>` - approval status: who approved, how many are left.
 */

import { getApprovals } from '../api/merge-requests.ts';
import { refFrom } from '../lib/parse.ts';
import { formatApprovals } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runApprovals(
  target: string | undefined,
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const approvals = await getApprovals(ref);
  out(approvals, formatApprovals(approvals), options);
}
