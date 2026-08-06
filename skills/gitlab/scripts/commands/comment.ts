/**
 * `comment <url|id> "msg"` - post a comment on the MR.
 *
 * The only write command in the skill; needs a token with the "api" scope
 * (read_api is not enough).
 */

import { postNote } from '../api/notes.ts';
import { refFrom } from '../lib/parse.ts';
import { GitLabError } from '../api/client.ts';
import { out, type OutputOptions } from './output.ts';

export async function runComment(
  target: string | undefined,
  messageParts: string[],
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const body = messageParts.join(' ');
  if (!body.trim()) throw new GitLabError('Empty comment. Provide a message.');
  const note = await postNote(ref, body);
  out(note, `Posted comment (note ${note.id}) on !${ref.iid}.`, options);
}
