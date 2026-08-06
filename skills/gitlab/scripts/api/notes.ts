/**
 * GitLab MR Notes API - comments on a merge request.
 *
 * The endpoint returns both human comments and system events ("added label",
 * "assigned to ..."). Filtering the latter out is the formatter's job, so the
 * raw list survives intact under --json.
 */

import { createClient } from './client.ts';
import { mrBase } from './merge-requests.ts';
import type { GitLabNote, MrRef } from '../types.ts';

/** List notes, oldest first. */
export function getNotes(ref: MrRef): Promise<GitLabNote[]> {
  return createClient(ref.host).get<GitLabNote[]>(`${mrBase(ref)}/notes`, {
    sort: 'asc',
    order_by: 'created_at',
    per_page: 100,
  });
}

/** Post a comment. Requires a token with the "api" scope. */
export function postNote(ref: MrRef, body: string): Promise<GitLabNote> {
  return createClient(ref.host).post<GitLabNote>(`${mrBase(ref)}/notes`, { body });
}
