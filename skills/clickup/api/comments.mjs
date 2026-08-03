/**
 * ClickUp Task Comments API.
 *
 * GET /task/{task_id}/comment returns the most recent 25 comments. Older pages
 * are fetched with cursor params: `start` (the `date` of the last comment on the
 * current page) and `start_id` (that comment's id). We page until a request
 * returns fewer than a full page.
 */

import { apiRequest } from './client.mjs';

const PAGE_SIZE = 25;

/**
 * Retrieve all comments on a task, oldest-cursor pagination followed to the end.
 *
 * @param {string} taskId
 * @param {object} [opts]
 * @param {string|null} [opts.teamId] - custom-id lookup when set
 * @returns {Promise<object[]>} flat array of comment objects
 */
export async function getTaskComments(taskId, opts = {}) {
  const { teamId = null } = opts;
  const comments = [];
  let start = null;
  let startId = null;

  // Guard against an unexpected non-terminating cursor.
  for (let guard = 0; guard < 1000; guard++) {
    const params = new URLSearchParams();
    if (teamId) {
      params.set('custom_task_ids', 'true');
      params.set('team_id', teamId);
    }
    if (start != null) {
      params.set('start', String(start));
      if (startId) params.set('start_id', startId);
    }

    const response = await apiRequest(
      `/task/${encodeURIComponent(taskId)}/comment?${params.toString()}`
    );
    const page = Array.isArray(response.comments) ? response.comments : [];
    comments.push(...page);

    if (page.length < PAGE_SIZE) break;

    const last = page[page.length - 1];
    start = last.date;
    startId = last.id;
  }

  return comments;
}
