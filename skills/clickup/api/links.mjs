/**
 * ClickUp links and attachments API methods
 */

import { apiRequest } from './client.mjs';
import { isCustomTaskId } from '../lib/parse.mjs';
import { getTeamId } from './user.mjs';

// Build query params for a link endpoint. Both path IDs share one custom_task_ids
// flag, so enable it if either the task or the linked task uses a custom ID.
async function linkQuery(taskId, linkedTaskId) {
  if (!isCustomTaskId(taskId) && !isCustomTaskId(linkedTaskId)) return '';
  const params = new URLSearchParams({ custom_task_ids: 'true', team_id: await getTeamId() });
  return `?${params.toString()}`;
}

// Add a link dependency between tasks
export async function addTaskLink(taskId, linkedTaskId) {
  const params = await linkQuery(taskId, linkedTaskId);
  const response = await apiRequest(`/task/${taskId}/link/${linkedTaskId}${params}`, {
    method: 'POST',
  });
  return response;
}

// Remove a link dependency between tasks
export async function removeTaskLink(taskId, linkedTaskId) {
  const params = await linkQuery(taskId, linkedTaskId);
  const response = await apiRequest(`/task/${taskId}/link/${linkedTaskId}${params}`, {
    method: 'DELETE',
  });
  return response;
}

// Add an external URL reference via comment
// (ClickUp doesn't have a dedicated external links field, so we use comments)
export async function addExternalLink(taskId, url, description = null) {
  const { postComment } = await import('./comments.mjs');

  const text = description
    ? `📎 **Reference**: [${description}](${url})`
    : `📎 **Reference**: ${url}`;

  return postComment(taskId, text);
}
