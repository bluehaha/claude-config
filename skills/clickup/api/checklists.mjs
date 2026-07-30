/**
 * ClickUp checklist API methods
 */

import { apiRequest } from './client.mjs';
import { taskQuery } from './tasks.mjs';

// Create a new checklist on a task
export async function createChecklist(taskId, name) {
  const params = await taskQuery(taskId);
  const response = await apiRequest(`/task/${taskId}/checklist${params}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response;
}

// Add item to a checklist
export async function addChecklistItem(checklistId, name, options = {}) {
  const body = { name, ...options };
  const response = await apiRequest(`/checklist/${checklistId}/checklist_item`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response;
}

// Get checklists for a task (from task details)
export async function getChecklists(taskId) {
  const params = await taskQuery(taskId);
  const response = await apiRequest(`/task/${taskId}${params}`);
  return response.checklists || [];
}

// Add item to first checklist, or create one if none exist
export async function addChecklistItemToTask(taskId, itemName, checklistName = 'Checklist') {
  let checklists = await getChecklists(taskId);

  // Create checklist if none exist
  if (checklists.length === 0) {
    const result = await createChecklist(taskId, checklistName);
    checklists = [result.checklist];
  }

  // Add item to first checklist
  const checklist = checklists[0];
  const item = await addChecklistItem(checklist.id, itemName);

  return { checklist, item };
}
