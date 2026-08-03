/**
 * URL and ID parsing utilities for ClickUp tasks.
 *
 * ClickUp task references come in a few shapes:
 *   86eyc0enm                                  bare id (native or custom)
 *   https://app.clickup.com/t/86abc123         plain task URL (native id)
 *   https://app.clickup.com/t/3716037/86eyc0enm
 *                                              team-scoped URL: /t/{team_id}/{task_id}
 *                                              where the task_id is a *custom* id
 *
 * parseTaskRef normalizes these into { taskId, teamId }. When the URL carries a
 * team_id (the /t/{team_id}/{task_id} shape), that team_id wins and signals a
 * custom-task-id lookup. Otherwise teamId is null and the caller falls back to
 * DEFAULT_TEAM_ID from .env.
 */

// A ClickUp team/workspace id is a run of digits. A task id is alphanumeric.
const TEAM_SCOPED_RE = /\/t\/(\d+)\/([a-zA-Z0-9]+)/;
const PLAIN_TASK_RE = /\/t\/([a-zA-Z0-9]+)/;

/**
 * @param {string} input - a task URL, or a bare task id
 * @returns {{ taskId: string, teamId: string|null } | null}
 */
export function parseTaskRef(input) {
  if (!input) return null;

  const trimmed = input.trim();

  // Team-scoped URL: /t/{team_id}/{task_id} - URL team_id wins, task_id is custom.
  const scoped = trimmed.match(TEAM_SCOPED_RE);
  if (scoped) {
    return { taskId: scoped[2], teamId: scoped[1] };
  }

  // Plain task URL: /t/{task_id}
  const plain = trimmed.match(PLAIN_TASK_RE);
  if (plain) {
    return { taskId: plain[1], teamId: null };
  }

  // Bare id (no slashes, alphanumeric).
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { taskId: trimmed, teamId: null };
  }

  return null;
}
