/**
 * Notion API client - core HTTP layer and environment handling
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/api -> scripts, where .env sits next to .env-example.
export const ENV_PATH: string = resolve(__dirname, '..', '.env');
export const API_BASE = 'https://api.notion.com/v1';

// Notion requires a version header on every request.
// See https://developers.notion.com/reference/versioning
export const NOTION_VERSION = '2022-06-28';

/** Load .env from the scripts directory. Returns false if it is missing or unreadable. */
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
 * Read the integration secret, exiting with setup instructions when absent.
 *
 * The `never` return branch is expressed via process.exit, so callers can treat
 * the result as a plain string.
 */
function requireToken(): string {
  const token = process.env.NOTION_API_TOKEN;
  if (!token) {
    console.error('Error: NOTION_API_TOKEN not configured');
    console.error('');
    console.error('Setup:');
    console.error('  1. Copy scripts/.env-example to scripts/.env');
    console.error('  2. Create an internal integration at https://www.notion.so/my-integrations');
    console.error('  3. Copy its Internal Integration Secret into NOTION_API_TOKEN');
    console.error('  4. Share the target page with the integration (page ... > Connections)');
    process.exit(1);
  }
  return token;
}

/**
 * Make an API request against the Notion v1 API.
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
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    // Notion returns 404 both for genuinely missing objects and for objects
    // the integration hasn't been granted access to - the sharing step is the
    // most common cause, so surface it.
    if (response.status === 404) {
      throw new Error(
        `Notion API error: 404 - ${text}\n` +
        'Hint: make sure the page is shared with your integration ' +
        '(open the page in Notion > ... menu > Connections > add your integration).'
      );
    }
    throw new Error(`Notion API error: ${response.status} - ${text}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}
