/**
 * `get <url|id>` - MR details: title, state, author, branches, description.
 */

import { getMergeRequest } from '../api/merge-requests.ts';
import { refFrom } from '../lib/parse.ts';
import { formatMr } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runGet(
  target: string | undefined,
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const mr = await getMergeRequest(ref);
  out(mr, formatMr(mr), options);
}
