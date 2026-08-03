/**
 * ClickUp Task Comments API.
 *
 * GET /task/{task_id}/comment returns the most recent 25 comments. Older pages
 * are fetched with cursor params: `start` (the `date` of the last comment on the
 * current page) and `start_id` (that comment's id). We page until a request
 * returns fewer than a full page.
 */

import { apiRequest } from './client.ts';
import type { ClickUpComment, ClickUpCommentsResponse } from '../types.ts';

const PAGE_SIZE = 25;

/** Guard against an unexpected non-terminating cursor. */
const MAX_PAGES = 1000;

export interface GetTaskCommentsOptions {
  /** Custom-id lookup when set. */
  teamId?: string | null;
}

/**
 * Retrieve all comments on a task, oldest-cursor pagination followed to the end.
 */
export async function getTaskComments(
  taskId: string,
  opts: GetTaskCommentsOptions = {},
): Promise<ClickUpComment[]> {
  const { teamId = null } = opts;
  const comments: ClickUpComment[] = [];
  let start: string | null = null;
  let startId: string | null = null;

  for (let guard = 0; guard < MAX_PAGES; guard++) {
    const params = new URLSearchParams();
    if (teamId) {
      params.set('custom_task_ids', 'true');
      params.set('team_id', teamId);
    }
    if (start != null) {
      params.set('start', String(start));
      if (startId) params.set('start_id', startId);
    }

    const response = await apiRequest<ClickUpCommentsResponse>(
      `/task/${encodeURIComponent(taskId)}/comment?${params.toString()}`,
    );
    const page = Array.isArray(response.comments) ? response.comments : [];
    comments.push(...page);

    if (page.length < PAGE_SIZE) break;

    const last = page[page.length - 1];
    if (!last) break;
    start = last.date;
    startId = last.id;
  }

  return comments;
}
