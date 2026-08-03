/**
 * ClickUp API client - core HTTP layer and environment handling
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ENV_PATH: string = resolve(__dirname, '..', '.env');
export const API_BASE = 'https://api.clickup.com/api/v2';

/** Load .env from the skill directory. Returns false if it is missing or unreadable. */
export function loadEnv(): boolean {
  if (!existsSync(ENV_PATH)) {
    return false;
  }

  try {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Append a key/value (with an optional preceding comment) to .env. */
export function appendToEnv(
  key: string,
  value: string,
  comment: string | null = null,
): boolean {
  try {
    let content = '\n';
    if (comment) {
      content += `# ${comment}\n`;
    }
    content += `${key}=${value}\n`;
    appendFileSync(ENV_PATH, content);
    process.env[key] = value;
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the personal API token, exiting with setup instructions when absent.
 *
 * The `never` return branch is expressed via process.exit, so callers can treat
 * the result as a plain string.
 */
function requireToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    console.error('Error: CLICKUP_API_TOKEN not configured');
    console.error('');
    console.error('Setup:');
    console.error('  1. Copy .env-example to .env in the skill directory');
    console.error('  2. In ClickUp, open Settings > Apps and generate a personal API token (starts with "pk_")');
    console.error('  3. Paste it into CLICKUP_API_TOKEN in .env');
    process.exit(1);
  }
  return token;
}

/**
 * Make an API request against the ClickUp v2 API.
 *
 * ClickUp expects the personal token in the Authorization header verbatim
 * (no "Bearer " prefix) - e.g. `Authorization: pk_12345...`.
 *
 * @typeParam T - the expected shape of the decoded JSON response.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = requireToken();

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(
        `ClickUp API error: 401 - ${text}\n` +
        'Hint: check that CLICKUP_API_TOKEN in .env is a valid personal token (starts with "pk_").'
      );
    }
    // 404 commonly means a custom task ID was used without the right team_id, or
    // vice versa - the URL/id routing is the usual culprit.
    if (response.status === 404) {
      throw new Error(
        `ClickUp API error: 404 - ${text}\n` +
        'Hint: if this is a custom task ID (e.g. "86eyc0enm"), it needs custom_task_ids=true ' +
        'and the correct team_id. Use a full /t/{team_id}/{task_id} URL, or set DEFAULT_TEAM_ID ' +
        'in .env.'
      );
    }
    throw new Error(`ClickUp API error: ${response.status} - ${text}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}
