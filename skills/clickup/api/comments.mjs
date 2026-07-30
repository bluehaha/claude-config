/**
 * ClickUp comments API methods
 */

import { apiRequest } from './client.mjs';
import { markdownToClickUp } from '../lib/markdown.mjs';
import { taskQuery } from './tasks.mjs';

// Get task comments
export async function getComments(taskId) {
  const params = await taskQuery(taskId);
  const response = await apiRequest(`/task/${taskId}/comment${params}`);
  return response.comments || [];
}

// Post a comment (with optional markdown formatting)
export async function postComment(taskId, text, useMarkdown = true) {
  let body;

  if (useMarkdown) {
    const commentArray = markdownToClickUp(text);
    body = JSON.stringify({ comment: commentArray });
  } else {
    body = JSON.stringify({ comment_text: text });
  }

  const params = await taskQuery(taskId);
  const response = await apiRequest(`/task/${taskId}/comment${params}`, {
    method: 'POST',
    body,
  });
  return response;
}

// Delete a comment
export async function deleteComment(commentId) {
  const response = await apiRequest(`/comment/${commentId}`, {
    method: 'DELETE',
  });
  return response;
}
