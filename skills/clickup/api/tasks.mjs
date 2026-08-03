/**
 * ClickUp Tasks API methods.
 *
 * A task response embeds most of what we want: fields, assignees, dates, the
 * (markdown) description, subtasks, and checklists. Comments are fetched
 * separately via the comments API.
 */

import { apiRequest } from './client.mjs';

/**
 * Retrieve a single task.
 *
 * @param {string} taskId
 * @param {object} [opts]
 * @param {string|null} [opts.teamId]  - when set, look the task up by custom id
 *                                        (sends custom_task_ids=true&team_id=...)
 * @param {boolean} [opts.includeSubtasks=true]
 * @returns {Promise<object>} the task object (checklists embedded)
 */
export async function getTask(taskId, opts = {}) {
  const { teamId = null, includeSubtasks = true } = opts;

  const params = new URLSearchParams();
  // Ask ClickUp to return the description as markdown rather than its internal
  // rich-text ops, so the JSON we emit is directly readable.
  params.set('include_markdown_description', 'true');
  if (includeSubtasks) {
    params.set('include_subtasks', 'true');
  }
  if (teamId) {
    params.set('custom_task_ids', 'true');
    params.set('team_id', teamId);
  }

  return apiRequest(`/task/${encodeURIComponent(taskId)}?${params.toString()}`);
}
