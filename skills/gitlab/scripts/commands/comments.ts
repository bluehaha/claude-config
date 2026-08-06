/**
 * `comments <url|id>` - list comments (notes). System events are hidden in the
 * formatted output but retained under --json.
 */

import { getNotes } from '../api/notes.ts';
import { refFrom } from '../lib/parse.ts';
import { formatNotes } from '../lib/format.ts';
import { out, type OutputOptions } from './output.ts';

export async function runComments(
  target: string | undefined,
  options: OutputOptions = {},
): Promise<void> {
  const ref = refFrom(target);
  const notes = await getNotes(ref);
  out(notes, formatNotes(notes), options);
}
