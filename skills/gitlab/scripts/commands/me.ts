/**
 * `me` - show the token's user. A sanity check that auth works, independent of
 * any project or MR.
 */

import { getCurrentUser } from '../api/user.ts';
import { GitLabError } from '../api/client.ts';
import { normalizeHost } from '../lib/parse.ts';
import { formatUser } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runMe(options: OutputOptions = {}): Promise<void> {
  const host = normalizeHost(process.env.GITLAB_HOST);
  if (!host) throw new GitLabError('Set GITLAB_HOST in .env to use `me`.');
  const user = await getCurrentUser(host);
  out(user, formatUser(user), options);
}
